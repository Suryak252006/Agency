'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApproveRequest, useRejectRequest, useRequests } from '@/lib/client/hooks';

export default function AdminRequestsPage() {
  const [filter, setFilter] = useState<string | undefined>('PENDING');
  const requests = useRequests(filter);
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();

  const items = requests.data?.data?.requests ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Requests</h1>
        <p className="mt-2 text-sm text-slate-600">Approve or reject edit and access requests.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {['PENDING', 'APPROVED', 'REJECTED'].map((status) => (
          <Button
            key={status}
            type="button"
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
          >
            {status}
          </Button>
        ))}
      </div>

      <div className="grid gap-4">
        {items.map((item: any) => (
          <Card key={item.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">{item.type}</CardTitle>
                <CardDescription>{item.reason}</CardDescription>
              </div>
              <Badge variant={item.status === 'PENDING' ? 'warning' : 'secondary'}>{item.status}</Badge>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button
                onClick={() => approveRequest.mutate({ requestId: item.id, response: 'Approved from dashboard' })}
                disabled={item.status !== 'PENDING' || approveRequest.isPending}
              >
                Approve
              </Button>
              <Button
                variant="outline"
                onClick={() => rejectRequest.mutate({ requestId: item.id, response: 'Rejected from dashboard' })}
                disabled={item.status !== 'PENDING' || rejectRequest.isPending}
              >
                Reject
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
