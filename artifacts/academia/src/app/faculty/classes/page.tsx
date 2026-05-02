'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useClassDetails, useClasses, useExams, useMarks, useSaveDraftMark, useSubmitMarks } from '@/lib/client/hooks';

export default function FacultyClassesPage() {
  const classes = useClasses();
  const classItems = classes.data?.data?.classes ?? [];
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});

  const classDetails = useClassDetails(selectedClassId || '');
  const exams = useExams(selectedClassId || undefined);
  const marks = useMarks(selectedExamId || '', selectedClassId || undefined);
  const saveDraftMark = useSaveDraftMark();
  const submitMarks = useSubmitMarks();

  useEffect(() => {
    if (!selectedClassId && classItems[0]?.id) {
      setSelectedClassId(classItems[0].id);
    }
  }, [classItems, selectedClassId]);

  useEffect(() => {
    const examItems = exams.data?.data?.exams ?? [];
    if (examItems[0]?.id) {
      setSelectedExamId((current) => (examItems.some((exam: any) => exam.id === current) ? current : examItems[0].id));
    } else {
      setSelectedExamId('');
    }
  }, [exams.data]);

  const students = classDetails.data?.data?.class?.students?.map((entry: any) => entry.student) ?? [];
  const marksItems = selectedClassId && selectedExamId ? marks.data?.data?.marks ?? [] : [];
  const marksByStudent = useMemo(
    () =>
      Object.fromEntries(
        marksItems.map((mark: any) => [
          mark.studentId,
          { value: mark.value, status: mark.status, id: mark.id },
        ])
      ),
    [marksItems]
  );

  useEffect(() => {
    if (!students.length) {
      setValues({});
      return;
    }

    setValues((current) => {
      const next = { ...current };
      students.forEach((student: any) => {
        next[student.id] = marksByStudent[student.id]?.value ?? current[student.id] ?? '';
      });
      return next;
    });
  }, [marksByStudent, students]);

  const handleSaveDrafts = async () => {
    if (!selectedClassId || !selectedExamId) {
      toast.error('Select a class and exam first');
      return;
    }

    const changedEntries = students.filter((student: any) => {
      const nextValue = values[student.id]?.trim();
      const currentValue = marksByStudent[student.id]?.value ?? '';
      return nextValue && nextValue !== currentValue;
    });

    if (!changedEntries.length) {
      toast.message('No new draft changes to save');
      return;
    }

    for (const student of changedEntries) {
      await saveDraftMark.mutateAsync({
        examId: selectedExamId,
        classId: selectedClassId,
        studentId: student.id,
        value: values[student.id].trim(),
      });
    }

    toast.success('Draft marks saved');
  };

  const handleSubmitMarks = async () => {
    if (!selectedClassId || !selectedExamId) {
      toast.error('Select a class and exam first');
      return;
    }

    await submitMarks.mutateAsync({
      examId: selectedExamId,
      classId: selectedClassId,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Marks workflow</h1>
        <p className="mt-2 text-sm text-slate-600">Save drafts for assigned classes, then submit them for admin review.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select class and exam</CardTitle>
          <CardDescription>Only your assigned classes are available here.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <select
            className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
          >
            <option value="">Select class</option>
            {classItems.map((item: any) => (
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
        <Button type="button" onClick={handleSaveDrafts} disabled={saveDraftMark.isPending || !students.length}>
          Save draft
        </Button>
        <Button type="button" variant="outline" onClick={handleSubmitMarks} disabled={submitMarks.isPending || !marksItems.length}>
          Submit for review
        </Button>
      </div>

      <div className="grid gap-4">
        {students.map((student: any) => {
          const rowState = marksByStudent[student.id]?.status ?? 'DRAFT';
          const readOnly = rowState === 'SUBMITTED' || rowState === 'APPROVED' || rowState === 'LOCKED';

          return (
            <Card key={student.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{student.name}</CardTitle>
                  <CardDescription>Roll No: {student.rollNo}</CardDescription>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{rowState}</span>
              </CardHeader>
              <CardContent>
                <Input
                  value={values[student.id] ?? ''}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [student.id]: event.target.value,
                    }))
                  }
                  placeholder="0-100, AB, or NA"
                  readOnly={readOnly}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
