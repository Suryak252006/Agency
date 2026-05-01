'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLogs } from '@/lib/client/hooks';

export default function AdminLogsPage() {
  const logs = useLogs(undefined, 14);
  const items = logs.data?.data?.logs ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Audit logs</h1>
        <p className="mt-2 text-sm text-slate-600">Recent actions captured by the audit trail.</p>
      </div>

      <div className="grid gap-4">
        {items.map((item: any) => (
          <Card key={item.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">{item.action}</CardTitle>
                <CardDescription>
                  {item.entity} · {new Date(item.createdAt).toLocaleString()}
                </CardDescription>
              </div>
              <Badge variant="secondary">{item.user?.role ?? 'user'}</Badge>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              By {item.user?.name ?? item.user?.email ?? item.userId}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}