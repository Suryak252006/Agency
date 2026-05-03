'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateRequest, useRequests } from '@/lib/client/hooks';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';

const MIN_REASON_LENGTH = 10;

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
  const reasonTrimmed = reason.trim();
  const reasonValid = reasonTrimmed.length >= MIN_REASON_LENGTH;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requests"
        description="Submit and track your current requests."
      />

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
            <Label htmlFor="request-reason">
              Reason{' '}
              <span className="font-normal text-slate-400">(min {MIN_REASON_LENGTH} characters)</span>
            </Label>
            <Textarea
              id="request-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Describe the reason for this request"
              rows={3}
            />
            {reason.length > 0 && !reasonValid && (
              <p className="text-xs text-red-600">
                Reason must be at least {MIN_REASON_LENGTH} characters ({reasonTrimmed.length}/{MIN_REASON_LENGTH}).
              </p>
            )}
          </div>
          <Button
            onClick={() => {
              createRequest.mutate(
                { type: 'EDIT_MARKS', reason: reasonTrimmed },
                { onSuccess: () => toast.success('Request submitted successfully') },
              );
              setReason('');
            }}
            disabled={!reasonValid || createRequest.isPending}
          >
            {createRequest.isPending ? 'Submitting...' : 'Submit request'}
          </Button>
        </CardContent>
      </Card>

      {requests.isError && (
        <ErrorBanner message="Failed to load requests. Please refresh the page." />
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
          <EmptyState message="No requests submitted yet." />
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
