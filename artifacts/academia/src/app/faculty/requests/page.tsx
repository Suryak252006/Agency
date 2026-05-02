'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateRequest, useRequests } from '@/lib/client/hooks';

interface Request {
  id: string;
  type: string;
  reason: string;
  status: string;
}

export default function FacultyRequestsPage() {
  const requests = useRequests();
  const createRequest = useCreateRequest();
  const [reason, setReason] = useState('');

  const items: Request[] = requests.data?.data?.requests ?? [];

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
          <div className="space-y-1">
            <Label>Request type</Label>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Edit Marks
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="request-reason">Reason</Label>
            <Textarea
              id="request-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Describe the reason for this request"
              rows={3}
            />
          </div>
          <Button
            onClick={() => {
              createRequest.mutate({ type: 'EDIT_MARKS', reason });
              setReason('');
            }}
            disabled={!reason.trim() || createRequest.isPending}
          >
            {createRequest.isPending ? 'Submitting...' : 'Submit request'}
          </Button>
        </CardContent>
      </Card>

      {requests.isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load requests. Please refresh the page.
        </div>
      )}

      <div className="grid gap-4">
        {requests.isPending ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </CardHeader>
            </Card>
          ))
        ) : items.length === 0 && !requests.isError ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
            No requests submitted yet.
          </div>
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{item.type.replace(/_/g, ' ')}</CardTitle>
                  <CardDescription>{item.reason}</CardDescription>
                </div>
                <Badge variant={item.status === 'PENDING' ? 'warning' : 'secondary'}>
                  {item.status}
                </Badge>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
