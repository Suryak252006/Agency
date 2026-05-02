'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAcceptMarks, useClasses, useExams, useMarks } from '@/lib/client/hooks';

export default function AdminClassesPage() {
  const classes = useClasses();
  const items = classes.data?.data?.classes ?? [];
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const exams = useExams(selectedClassId || undefined);
  const marks = useMarks(selectedExamId || '', selectedClassId || undefined);
  const acceptMarks = useAcceptMarks();

  useEffect(() => {
    if (!selectedClassId && items[0]?.id) {
      setSelectedClassId(items[0].id);
    }
  }, [items, selectedClassId]);

  useEffect(() => {
    const examItems = exams.data?.data?.exams ?? [];
    if (examItems[0]?.id) {
      setSelectedExamId((current) => (examItems.some((exam: any) => exam.id === current) ? current : examItems[0].id));
    } else {
      setSelectedExamId('');
    }
  }, [exams.data]);

  const marksItems = selectedClassId && selectedExamId ? marks.data?.data?.marks ?? [] : [];

  const lockedIds = useMemo(
    () => marksItems.filter((item: any) => item.status === 'LOCKED').map((item: any) => item.id),
    [marksItems]
  );

  const statusBadgeClass = (status: string) => {
    if (status === 'ACCEPTED') return 'bg-green-100 text-green-700';
    if (status === 'LOCKED') return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Review marks</h1>
        <p className="mt-2 text-sm text-slate-600">
          Accept locked marks submitted by faculty for this class and exam.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select review context</CardTitle>
          <CardDescription>Choose a class and exam to inspect locked marks.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <select
            className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
          >
            <option value="">Select class</option>
            {items.map((item: any) => (
              <option key={item.id} value={item.id}>
                {item.name} - Grade {item.grade} {item.section}
              </option>
            ))}
          </select>

          <select
            className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={selectedExamId}
            onChange={(event) => setSelectedExamId(event.target.value)}
            disabled={!selectedClassId}
          >
            <option value="">Select exam</option>
            {(exams.data?.data?.exams ?? []).map((exam: any) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={() => acceptMarks.mutate({ marksIds: lockedIds })}
          disabled={!lockedIds.length || acceptMarks.isPending}
        >
          Accept locked marks ({lockedIds.length})
        </Button>
      </div>

      <div className="grid gap-4">
        {marksItems.map((item: any) => (
          <Card key={item.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">{item.student.name}</CardTitle>
                <CardDescription>Roll No: {item.student.rollNo}</CardDescription>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(item.status)}`}>
                {item.status}
              </span>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">Mark: {item.value}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
