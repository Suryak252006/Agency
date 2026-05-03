'use client';

import { useState } from 'react';
import { CalendarCheck, CheckCircle2, Users } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { useClasses } from '@/lib/client/hooks';
import { toast } from 'sonner';

interface AttendanceSession {
  id: string;
  date: string;
  class: { id: string; name: string };
  isFinalized: boolean;
  _count: { records: number };
}

function useTodaySessions(classId?: string) {
  const params = new URLSearchParams({ limit: '10' });
  if (classId) params.set('classId', classId);
  return useQuery<{ data: { sessions: AttendanceSession[] } }>({
    queryKey: ['attendance', 'faculty', classId],
    queryFn: () => fetch(`/api/v1/attendance?${params}`).then((r) => r.json()),
    staleTime: 30_000,
  });
}

function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { classId: string; date: string }) =>
      fetch('/api/v1/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['attendance', 'faculty'] });
      if (data?.data?.session?.id) {
        toast.success(`Session opened — ID: ${data.data.session.id.slice(0, 8)}`);
      }
    },
    onError: () => toast.error('Failed to open attendance session'),
  });
}

export default function FacultyAttendancePage() {
  const [classId, setClassId] = useState('');
  const classes = useClasses();
  const sessions = useTodaySessions(classId || undefined);
  const createSession = useCreateSession();

  const classItems = (classes.data?.data?.classes ?? []) as Array<{ id: string; name: string }>;
  const sessionItems: AttendanceSession[] = sessions.data?.data?.sessions ?? [];
  const today = new Date().toISOString().slice(0, 10);

  async function handleOpenSession() {
    if (!classId) return;
    await createSession.mutateAsync({ classId, date: today });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Open a session for today and mark student attendance."
      >
        <Button onClick={handleOpenSession} disabled={!classId || createSession.isPending}>
          <CalendarCheck className="mr-2 h-4 w-4" />
          {createSession.isPending ? 'Opening\u2026' : 'Open today\u2019s session'}
        </Button>
      </PageHeader>

      {sessions.isError && <ErrorBanner message="Failed to load attendance sessions." />}

      <div className="flex items-center gap-3">
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {classItems.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {sessions.isPending ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-64 mt-1" /></CardHeader></Card>
          ))
        ) : sessionItems.length === 0 && !sessions.isError ? (
          <EmptyState message={classId ? "No attendance sessions for this class. Open one above." : "Select a class to view sessions."} />
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
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      {session._count.records}
                    </Badge>
                    {session.isFinalized
                      ? <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />Finalized</Badge>
                      : <Badge variant="outline">In progress</Badge>
                    }
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
