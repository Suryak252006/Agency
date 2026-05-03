'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useApproveRequest, useRejectRequest, useRequests } from '@/lib/client/hooks';
import { PageHeader } from '@/components/page-header';

interface Request {
  id: string;
  type: string;
  reason: string;
  status: string;
}

export default function AdminRequestsPage() {
  const [filter, setFilter] = useState<string | undefined>('PENDING');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const requests = useRequests(filter);
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();

  const items: Request[] = requests.data?.data?.requests ?? [];

  const handleReject = () => {
    if (!rejectTarget) return;
    rejectRequest.mutate(
      { requestId: rejectTarget, response: rejectReason.trim() || 'Request rejected.' },
      {
        onSettled: () => {
          setRejectTarget(null);
          setRejectReason('');
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requests"
        description="Approve or reject edit and access requests."
      />

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

      {requests.isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load requests. Please refresh the page.
        </div>
      )}

      <div className="grid gap-4">
        {requests.isPending ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))
        ) : items.length === 0 && !requests.isError ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
            No {filter?.toLowerCase() ?? ''} requests found.
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
              <CardContent className="flex flex-wrap gap-3">
                <Button
                  onClick={() =>
                    approveRequest.mutate({ requestId: item.id, response: 'Approved.' })
                  }
                  disabled={item.status !== 'PENDING' || approveRequest.isPending}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRejectTarget(item.id)}
                  disabled={item.status !== 'PENDING' || rejectRequest.isPending}
                >
                  Reject
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject request</DialogTitle>
            <DialogDescription>
              Optionally provide a reason for the rejection. This will be visible to the requester.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason (optional)</Label>
            <Textarea
              id="reject-reason"
              placeholder="Explain why this request is being rejected..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectRequest.isPending}
            >
              {rejectRequest.isPending ? 'Rejecting...' : 'Reject request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
