'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useLogs } from '@/lib/client/hooks';

export default function AdminLogsPage() {
  const [action, setAction] = useState('');
  const logs = useLogs(action || undefined, 30);
  const items = logs.data?.data?.logs ?? [];
  const total = logs.data?.data?.total ?? items.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit logs</h1>
        <p className="text-sm text-slate-600">
          Institution-scoped audit activity backed by the secured logs API.
        </p>
      </div>

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
          <CardDescription>{total} events in the selected window.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
              No audit events matched the current filter.
            </div>
          ) : (
            items.map((log: any) => (
              <div key={log.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{log.action}</Badge>
                      <span className="text-sm text-slate-500">{log.entity}</span>
                    </div>
                    <p className="text-sm text-slate-700">
                      {log.user?.name ?? 'Unknown user'} • {new Date(log.createdAt).toLocaleString()}
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
