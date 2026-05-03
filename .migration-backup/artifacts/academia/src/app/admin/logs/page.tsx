'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useLogs } from '@/lib/client/hooks';
import { PageHeader } from '@/components/page-header';

interface LogEntry {
  id: string;
  action: string;
  entity: string;
  ipAddress?: string;
  createdAt: string;
  user?: { name?: string };
}

export default function AdminLogsPage() {
  const [action, setAction] = useState('');
  const logs = useLogs(action || undefined, 30);
  const items: LogEntry[] = logs.data?.data?.logs ?? [];
  const total = logs.data?.data?.total ?? items.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit logs"
        description="Institution-scoped audit activity backed by the secured logs API."
        descriptionClassName="text-sm text-slate-600"
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter by action key to inspect a narrower slice of activity.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Filter by action, for example REQUEST_APPROVED"
            value={action}
            onChange={(event) => setAction(event.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>
            {logs.isPending ? 'Loading events…' : `${total} events in the selected window.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {logs.isError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Failed to load audit logs. Please refresh the page.
            </div>
          ) : logs.isPending ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-32 rounded-full" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
              No audit events matched the current filter.
            </div>
          ) : (
            items.map((log) => (
              <div key={log.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{log.action}</Badge>
                      <span className="text-sm text-slate-500">{log.entity}</span>
                    </div>
                    <p className="text-sm text-slate-700">
                      {log.user?.name ?? 'Unknown user'} &bull;{' '}
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-xs text-slate-500">{log.ipAddress ?? 'No IP recorded'}</div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
