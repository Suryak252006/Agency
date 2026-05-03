'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudents } from '@/lib/client/hooks';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';

interface Student {
  id: string;
  name: string;
  email: string;
  rollNo: string;
}

export default function AdminStudentsPage() {
  const students = useStudents();
  const items: Student[] = students.data?.data?.students ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="School-wide student directory for the current tenant."
      />

      {students.isError && (
        <ErrorBanner message="Failed to load students. Please refresh the page." />
      )}

      <div className="grid gap-4">
        {students.isPending ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))
        ) : items.length === 0 && !students.isError ? (
          <EmptyState message="No students found for this tenant." />
        ) : (
          items.map((student) => (
            <Card key={student.id}>
              <CardHeader>
                <CardTitle className="text-base">{student.name}</CardTitle>
                <CardDescription>{student.email}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">Roll No: {student.rollNo}</CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
