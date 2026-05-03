'use client';

import { useState } from 'react';
import { BookOpen, Save } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { useClasses } from '@/lib/client/hooks';
import { toast } from 'sonner';

interface Exam {
  id: string;
  name: string;
  maxMarks: number;
  startDate: string;
  department: { name: string };
}

interface ClassStudent {
  studentId: string;
  student: { id: string; name: string; rollNo: string };
}

interface MarksEntry {
  studentId: string;
  value: string;
}

function useExams(classId?: string) {
  const params = new URLSearchParams({ limit: '30' });
  if (classId) params.set('classId', classId);
  return useQuery<{ data: { exams: Exam[] } }>({
    queryKey: ['exams', 'marks', classId],
    queryFn: () => fetch(`/api/v1/exams?${params}`).then((r) => r.json()),
    enabled: !!classId,
    staleTime: 60_000,
  });
}

function useClassStudents(classId?: string) {
  return useQuery<{ data: { students: ClassStudent[] } }>({
    queryKey: ['classes', classId, 'students'],
    queryFn: () => fetch(`/api/v1/classes/${classId}/students`).then((r) => r.json()),
    enabled: !!classId,
    staleTime: 60_000,
  });
}

function useSubmitMarks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entries: Array<{ examId: string; classId: string; studentId: string; value: string }>) =>
      fetch('/api/v1/marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marks'] }); toast.success('Marks submitted'); },
    onError: () => toast.error('Failed to submit marks'),
  });
}

export default function FacultyMarksPage() {
  const [classId, setClassId] = useState('');
  const [examId, setExamId] = useState('');
  const [entries, setEntries] = useState<Record<string, string>>({});

  const classes = useClasses();
  const exams = useExams(classId || undefined);
  const students = useClassStudents(classId || undefined);
  const submitMarks = useSubmitMarks();

  const classItems = (classes.data?.data?.classes ?? []) as Array<{ id: string; name: string }>;
  const examItems: Exam[] = exams.data?.data?.exams ?? [];
  const studentItems: ClassStudent[] = students.data?.data?.students ?? [];

  const selectedExam = examItems.find((e) => e.id === examId);

  async function handleSubmit() {
    if (!classId || !examId) return;
    const payload = studentItems
      .filter((s) => entries[s.studentId] !== undefined && entries[s.studentId].trim() !== '')
      .map((s) => ({ examId, classId, studentId: s.studentId, value: entries[s.studentId].trim() }));
    if (payload.length === 0) { toast.error('Enter at least one mark'); return; }
    await submitMarks.mutateAsync(payload);
    setEntries({});
  }

  const filledCount = Object.values(entries).filter((v) => v.trim() !== '').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Marks entry" description="Enter student marks for an exam.">
        {filledCount > 0 && (
          <Button onClick={handleSubmit} disabled={submitMarks.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {submitMarks.isPending ? 'Submitting…' : `Submit ${filledCount} mark${filledCount !== 1 ? 's' : ''}`}
          </Button>
        )}
      </PageHeader>

      {(classes.isError || exams.isError || students.isError) && <ErrorBanner message="Failed to load data." />}

      <div className="flex gap-3 flex-wrap">
        <Select value={classId} onValueChange={(v) => { setClassId(v); setExamId(''); setEntries({}); }}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {classItems.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={examId} onValueChange={(v) => { setExamId(v); setEntries({}); }} disabled={!classId || examItems.length === 0}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select exam" />
          </SelectTrigger>
          <SelectContent>
            {examItems.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selectedExam && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
          <BookOpen className="h-4 w-4 text-slate-400" />
          <span className="font-medium">{selectedExam.name}</span>
          <Badge variant="secondary">Max: {selectedExam.maxMarks}</Badge>
          <span className="text-slate-500">{selectedExam.department.name}</span>
          <span className="text-slate-500 ml-auto">{new Date(selectedExam.startDate).toLocaleDateString('en-IN')}</span>
        </div>
      )}

      <div className="grid gap-2">
        {!classId ? (
          <EmptyState message="Select a class and exam to enter marks." />
        ) : students.isPending ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className="h-4 w-48" /></CardHeader></Card>
          ))
        ) : studentItems.length === 0 ? (
          <EmptyState message="No students enrolled in this class." />
        ) : !examId ? (
          <EmptyState message="Select an exam above to begin entering marks." />
        ) : (
          studentItems.map((s) => (
            <Card key={s.studentId}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{s.student.name}</p>
                    <p className="text-xs text-slate-500">#{s.student.rollNo}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="—"
                      className="w-24 text-right"
                      value={entries[s.studentId] ?? ''}
                      onChange={(e) => setEntries((prev) => ({ ...prev, [s.studentId]: e.target.value }))}
                    />
                    {selectedExam && (
                      <span className="text-sm text-slate-400 w-12">/ {selectedExam.maxMarks}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
