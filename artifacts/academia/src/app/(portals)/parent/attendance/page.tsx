'use client';

import { CalendarCheck, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';

interface AttendanceSession {
  id: string;
  date: string;
  class: { id: string; name: string };
  _count: { records: number };
}

function useAttendanceSessions() {
  return useQuery<{ data: { sessions: AttendanceSession[]; total: number } }>({
    queryKey: ['parent', 'attendance'],
    queryFn: () => fetch('/api/v1/attendance?limit=30').then((r) => r.json()),
    staleTime: 60_000,
  });
}

function StatusIcon({ count }: { count: number }) {
  if (count > 0) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  return <Clock className="h-4 w-4 text-amber-400" />;
}

export default function ParentAttendancePage() {
  const sessions = useAttendanceSessions();
  const items: AttendanceSession[] = sessions.data?.data?.sessions ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Your child's attendance history." />

      {sessions.isError && <ErrorBanner message="Failed to load attendance data." />}

      <div className="grid gap-4">
        {sessions.isPending ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-64 mt-1" /></CardHeader></Card>
          ))
        ) : items.length === 0 && !sessions.isError ? (
          <EmptyState message="No attendance records available yet." />
        ) : (
          items.map((session) => (
            <Card key={session.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarCheck className="h-4 w-4 text-slate-400" />
                      {new Date(session.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </CardTitle>
                    <CardDescription>{session.class.name}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusIcon count={session._count.records} />
                    <Badge variant={session._count.records > 0 ? 'default' : 'secondary'}>
                      {session._count.records > 0 ? 'Marked' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
