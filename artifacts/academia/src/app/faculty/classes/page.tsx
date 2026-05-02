'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useClassDetails, useClasses, useExams, useMarks, useSaveMark, useRequestLock } from '@/lib/client/hooks';

const STATUS_META: Record<string, { label: string; className: string }> = {
  SUBMITTED:    { label: 'Submitted',    className: 'bg-blue-100 text-blue-700' },
  LOCK_PENDING: { label: 'Lock pending', className: 'bg-amber-100 text-amber-700' },
  LOCKED:       { label: 'Locked',       className: 'bg-green-100 text-green-700' },
};

export default function FacultyClassesPage() {
  const classes = useClasses();
  const classItems = classes.data?.data?.classes ?? [];

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});

  const classDetails = useClassDetails(selectedClassId);
  const exams = useExams(selectedClassId || undefined);
  const marks = useMarks(selectedExamId, selectedClassId || undefined);
  const saveMark = useSaveMark();
  const requestLock = useRequestLock();

  useEffect(() => {
    if (!selectedClassId && classItems[0]?.id) setSelectedClassId(classItems[0].id);
  }, [classItems, selectedClassId]);

  useEffect(() => {
    const examItems = exams.data?.data?.exams ?? [];
    setSelectedExamId((cur) =>
      examItems.some((e: any) => e.id === cur) ? cur : examItems[0]?.id ?? ''
    );
  }, [exams.data]);

  const students = classDetails.data?.data?.class?.students?.map((e: any) => e.student) ?? [];
  const marksItems = selectedClassId && selectedExamId ? marks.data?.data?.marks ?? [] : [];

  const marksByStudent = useMemo(
    () =>
      Object.fromEntries(
        marksItems.map((m: any) => [m.studentId, { value: m.value, status: m.status, id: m.id }])
      ),
    [marksItems]
  );

  useEffect(() => {
    if (!students.length) { setValues({}); return; }
    setValues((cur) => {
      const next = { ...cur };
      students.forEach((s: any) => {
        next[s.id] = marksByStudent[s.id]?.value ?? cur[s.id] ?? '';
      });
      return next;
    });
  }, [marksByStudent, students]);

  const handleSaveMarks = async () => {
    if (!selectedClassId || !selectedExamId) { toast.error('Select a class and exam first'); return; }

    const changed = students.filter((s: any) => {
      const next = values[s.id]?.trim();
      return next && next !== (marksByStudent[s.id]?.value ?? '');
    });

    if (!changed.length) { toast.message('No changes to save'); return; }

    for (const student of changed) {
      await saveMark.mutateAsync({
        examId: selectedExamId,
        classId: selectedClassId,
        studentId: student.id,
        value: values[student.id].trim(),
      });
    }
    toast.success(`${changed.length} mark(s) saved`);
  };

  const handleRequestLock = async () => {
    if (!selectedClassId || !selectedExamId) { toast.error('Select a class and exam first'); return; }
    const submittedCount = marksItems.filter((m: any) => m.status === 'SUBMITTED').length;
    if (!submittedCount) { toast.error('No submitted marks available to request lock'); return; }
    await requestLock.mutateAsync({ examId: selectedExamId, classId: selectedClassId });
  };

  const hasSubmitted   = marksItems.some((m: any) => m.status === 'SUBMITTED');
  const hasPending     = marksItems.some((m: any) => m.status === 'LOCK_PENDING');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Marks entry</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter marks for your class. When ready, request a lock — Admin or HOD will approve to finalise.
        </p>
      </div>

      {/* Workflow legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <span key={key} className={`rounded-full px-3 py-1 font-medium ${meta.className}`}>
            {meta.label}
          </span>
        ))}
        <span className="text-slate-400 self-center">← marks progress through these states</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select class and exam</CardTitle>
          <CardDescription>Only your assigned classes are available.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <select
            className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="">Select class</option>
            {classItems.map((item: any) => (
              <option key={item.id} value={item.id}>
                {item.name} — Grade {item.grade}{item.section}
              </option>
            ))}
          </select>

          <select
            className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            disabled={!selectedClassId}
          >
            <option value="">Select exam</option>
            {(exams.data?.data?.exams ?? []).map((exam: any) => (
              <option key={exam.id} value={exam.id}>{exam.name}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleSaveMarks}
          disabled={saveMark.isPending || !students.length}
        >
          Save marks
        </Button>
        <Button
          variant="outline"
          onClick={handleRequestLock}
          disabled={requestLock.isPending || !hasSubmitted}
          title="Submits a lock request to Admin/HOD. You cannot directly lock marks."
        >
          Request lock
        </Button>
      </div>

      {hasPending && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Some marks have a pending lock request — waiting for Admin or HOD approval.
        </div>
      )}

      <div className="grid gap-4">
        {students.map((student: any) => {
          const row = marksByStudent[student.id];
          const status = row?.status ?? 'SUBMITTED';
          const readOnly = status === 'LOCK_PENDING' || status === 'LOCKED';
          const meta = STATUS_META[status] ?? STATUS_META.SUBMITTED;

          return (
            <Card key={student.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base">{student.name}</CardTitle>
                  <CardDescription>Roll No: {student.rollNo}</CardDescription>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${meta.className}`}>
                  {meta.label}
                </span>
              </CardHeader>
              <CardContent>
                <Input
                  value={values[student.id] ?? ''}
                  onChange={(e) => setValues((cur) => ({ ...cur, [student.id]: e.target.value }))}
                  placeholder="0–100, AB, or NA"
                  readOnly={readOnly}
                  className={readOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}
                />
                {status === 'LOCK_PENDING' && (
                  <p className="mt-1 text-xs text-amber-600">Awaiting Admin/HOD approval to lock</p>
                )}
                {status === 'LOCKED' && (
                  <p className="mt-1 text-xs text-green-600">Locked and finalised</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
