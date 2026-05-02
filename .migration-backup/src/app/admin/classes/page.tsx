'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApproveMarks, useClasses, useExams, useLockMarks, useMarks } from '@/lib/client/hooks';

export default function AdminClassesPage() {
  const classes = useClasses();
  const items = classes.data?.data?.classes ?? [];
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const exams = useExams(selectedClassId || undefined);
  const marks = useMarks(selectedExamId || '', selectedClassId || undefined);
  const approveMarks = useApproveMarks();
  const lockMarks = useLockMarks();

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
  const submittedIds = useMemo(
    () => marksItems.filter((item: any) => item.status === 'SUBMITTED').map((item: any) => item.id),
    [marksItems]
  );
  const approvedIds = useMemo(
    () => marksItems.filter((item: any) => item.status === 'APPROVED').map((item: any) => item.id),
    [marksItems]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Classes</h1>
        <p className="mt-2 text-sm text-slate-600">Review submitted marks and complete admin approvals.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select review context</CardTitle>
          <CardDescription>Choose a class and exam to inspect submitted marks.</CardDescription>
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
          onClick={() => approveMarks.mutate({ marksIds: submittedIds })}
          disabled={!submittedIds.length || approveMarks.isPending}
        >
          Approve submitted ({submittedIds.length})
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => lockMarks.mutate({ marksIds: approvedIds })}
          disabled={!approvedIds.length || lockMarks.isPending}
        >
          Lock approved ({approvedIds.length})
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
              <Badge variant="secondary">{item.status}</Badge>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">Value: {item.value}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
