'use client';

import { useState } from 'react';
import { CalendarCheck, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { useClasses } from '@/lib/client/hooks';

interface AttendanceSession {
  id: string;
  date: string;
  class: { id: string; name: string };
  isFinalized: boolean;
  _count: { records: number };
}

function useAttendanceSessions(classId?: string) {
  const params = new URLSearchParams({ limit: '50' });
  if (classId) params.set('classId', classId);
  return useQuery<{ data: { sessions: AttendanceSession[]; total: number } }>({
    queryKey: ['attendance', 'sessions', classId],
    queryFn: () => fetch(`/api/v1/attendance?${params}`).then((r) => r.json()),
    staleTime: 30_000,
  });
}

function statusIcon(count: number) {
  if (count > 0) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  return <Clock className="h-4 w-4 text-amber-400" />;
}

export default function AdminAttendancePage() {
  const [classId, setClassId] = useState<string>('');
  const classes = useClasses();
  const sessions = useAttendanceSessions(classId || undefined);

  const classItems = (classes.data?.data?.classes ?? []) as Array<{ id: string; name: string }>;
  const sessionItems: AttendanceSession[] = sessions.data?.data?.sessions ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Review attendance sessions across all classes. Faculty mark attendance from their portal."
      />

      {sessions.isError && <ErrorBanner message="Failed to load attendance sessions." />}

      <div className="flex items-center gap-3">
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All classes</SelectItem>
            {classItems.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {classId && (
          <Button variant="ghost" size="sm" onClick={() => setClassId('')}>
            Clear filter
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {sessions.isPending ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-64 mt-1" /></CardHeader></Card>
          ))
        ) : sessionItems.length === 0 && !sessions.isError ? (
          <EmptyState message="No attendance sessions found. Faculty mark attendance from their portal." />
        ) : (
          sessionItems.map((session) => (
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
                    {statusIcon(session._count.records)}
                    <Badge variant={session._count.records > 0 ? 'default' : 'secondary'}>
                      {session._count.records} records
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
