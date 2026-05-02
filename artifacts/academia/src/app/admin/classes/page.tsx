'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useApproveLock, useClasses, useExams, useMarks, useRejectLock } from '@/lib/client/hooks';

const STATUS_META: Record<string, { label: string; className: string }> = {
  SUBMITTED:    { label: 'Submitted',    className: 'bg-blue-100 text-blue-700' },
  LOCK_PENDING: { label: 'Lock pending', className: 'bg-amber-100 text-amber-700' },
  LOCKED:       { label: 'Locked',       className: 'bg-green-100 text-green-700' },
};

export default function AdminClassesPage() {
  const classes = useClasses();
  const items = classes.data?.data?.classes ?? [];
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const exams = useExams(selectedClassId || undefined);
  const marks = useMarks(selectedExamId, selectedClassId || undefined);
  const approveLock = useApproveLock();
  const rejectLock = useRejectLock();

  useEffect(() => {
    if (!selectedClassId && items[0]?.id) setSelectedClassId(items[0].id);
  }, [items, selectedClassId]);

  useEffect(() => {
    const examItems = exams.data?.data?.exams ?? [];
    setSelectedExamId((cur) =>
      examItems.some((e: any) => e.id === cur) ? cur : examItems[0]?.id ?? ''
    );
  }, [exams.data]);

  const marksItems = selectedClassId && selectedExamId ? marks.data?.data?.marks ?? [] : [];

  const lockPendingIds = useMemo(
    () => marksItems.filter((m: any) => m.status === 'LOCK_PENDING').map((m: any) => m.id),
    [marksItems]
  );

  const handleApprove = () => {
    if (!lockPendingIds.length) { toast.error('No lock-pending marks to approve'); return; }
    approveLock.mutate({ marksIds: lockPendingIds });
    setShowRejectForm(false);
  };

  const handleReject = () => {
    if (!lockPendingIds.length) { toast.error('No lock-pending marks to reject'); return; }
    if (!rejectReason.trim()) { toast.error('A rejection reason is required'); return; }
    rejectLock.mutate(
      { marksIds: lockPendingIds, reason: rejectReason.trim() },
      { onSuccess: () => { setRejectReason(''); setShowRejectForm(false); } }
    );
  };

  const pendingCount = lockPendingIds.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Review lock requests</h1>
        <p className="mt-2 text-sm text-slate-600">
          Faculty submit lock requests when marks are finalised. Approve to lock them permanently, or reject to return for editing.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select class and exam</CardTitle>
          <CardDescription>Review lock-pending marks and take action.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <select
            className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="">Select class</option>
            {items.map((item: any) => (
              <option key={item.id} value={item.id}>
                {item.name} — Grade {item.grade}{item.section}
              </option>
            ))}
          </select>

          <select
            className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            disabled={!selectedClassId}
          >
            <option value="">Select exam</option>
            {(exams.data?.data?.exams ?? []).map((exam: any) => (
              <option key={exam.id} value={exam.id}>{exam.name}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Action bar — only shown when there are pending lock requests */}
      {pendingCount > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="text-sm font-medium text-amber-800">
            {pendingCount} mark(s) have a pending lock request from faculty.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleApprove}
              disabled={approveLock.isPending}
            >
              Approve lock ({pendingCount})
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowRejectForm((v) => !v)}
              disabled={rejectLock.isPending}
            >
              Reject lock
            </Button>
          </div>

          {showRejectForm && (
            <div className="flex flex-col gap-2 pt-1">
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection (required)"
                className="bg-white"
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={rejectLock.isPending || !rejectReason.trim()}
                >
                  Confirm rejection
                </Button>
                <Button variant="ghost" onClick={() => setShowRejectForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4">
        {marksItems.map((item: any) => {
          const meta = STATUS_META[item.status] ?? STATUS_META.SUBMITTED;
          return (
            <Card key={item.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base">{item.student.name}</CardTitle>
                  <CardDescription>Roll No: {item.student.rollNo}</CardDescription>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${meta.className}`}>
                  {meta.label}
                </span>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <span className="font-medium">Mark:</span> {item.value}
                {item.lockRequestedAt && (
                  <span className="ml-4 text-xs text-slate-400">
                    Lock requested: {new Date(item.lockRequestedAt).toLocaleString()}
                  </span>
                )}
                {item.lockedAt && (
                  <span className="ml-4 text-xs text-green-600">
                    Locked: {new Date(item.lockedAt).toLocaleString()}
                  </span>
                )}
              </CardContent>
            </Card>
          );
        })}
        {marksItems.length === 0 && selectedExamId && (
          <p className="text-sm text-slate-400 text-center py-8">No marks found for this selection.</p>
        )}
      </div>
    </div>
  );
}
