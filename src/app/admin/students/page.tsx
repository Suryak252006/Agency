'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStudents } from '@/lib/client/hooks';

export default function AdminStudentsPage() {
  const students = useStudents();
  const items = students.data?.data?.students ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Students</h1>
        <p className="mt-2 text-sm text-slate-600">School-wide student directory for the current tenant.</p>
      </div>

      <div className="grid gap-4">
        {items.map((student: any) => (
          <Card key={student.id}>
            <CardHeader>
              <CardTitle className="text-base">{student.name}</CardTitle>
              <CardDescription>{student.email}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">Roll No: {student.rollNo}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
