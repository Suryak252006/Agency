'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateRequest, useRequests } from '@/lib/client/hooks';

export default function FacultyRequestsPage() {
  const requests = useRequests();
  const createRequest = useCreateRequest();
  const [reason, setReason] = useState('');

  const items = requests.data?.data?.requests ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Requests</h1>
        <p className="mt-2 text-sm text-slate-600">Submit and track your current requests.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create request</CardTitle>
          <CardDescription>Use this to request a marks edit or access change.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input value="EDIT_MARKS" readOnly />
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Describe the request" />
          <Button
            onClick={() => createRequest.mutate({ type: 'EDIT_MARKS', reason })}
            disabled={!reason.trim() || createRequest.isPending}
          >
            Submit request
          </Button>
        </CardContent>
      </Card>

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
          </Card>
        ))}
      </div>
    </div>
  );
}