'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApproveLock, useClasses, useExams, useMarks, useRejectLock } from '@/lib/client/hooks';
import { PageHeader } from '@/components/page-header';

const STATUS_META: Record<string, { label: string; className: string }> = {
  SUBMITTED:    { label: 'Submitted',    className: 'bg-blue-100 text-blue-700' },
  LOCK_PENDING: { label: 'Lock pending', className: 'bg-amber-100 text-amber-700' },
  LOCKED:       { label: 'Locked',       className: 'bg-green-100 text-green-700' },
};

interface ClassItem {
  id: string;
  name: string;
  grade: number;
  section: string;
}

interface ExamItem {
  id: string;
  name: string;
}

interface MarkItem {
  id: string;
  status: string;
  value: string;
  classId: string;
  lockRequestedAt?: string;
  lockedAt?: string;
  student: { name: string; rollNo: string };
}

export default function AdminClassesPage() {
  const classes = useClasses();
  const items: ClassItem[] = classes.data?.data?.classes ?? [];
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
    const examItems: ExamItem[] = exams.data?.data?.exams ?? [];
    setSelectedExamId((cur) =>
      examItems.some((e) => e.id === cur) ? cur : examItems[0]?.id ?? ''
    );
  }, [exams.data]);

  const marksItems: MarkItem[] = selectedClassId && selectedExamId ? marks.data?.data?.marks ?? [] : [];
  const examItems: ExamItem[] = exams.data?.data?.exams ?? [];

  const lockPendingIds = useMemo(
    () => marksItems.filter((m) => m.status === 'LOCK_PENDING').map((m) => m.id),
    [marksItems]
  );

  const handleApprove = () => {
    if (!lockPendingIds.length) { toast.error('No lock-pending marks to approve'); return; }
    approveLock.mutate({ marksIds: lockPendingIds });
    setShowRejectForm(false);
  };

  const handleReject = () => {
    if (!lockPendingIds.length) { toast.error('No lock-pending marks to reject'); return; }
    if (rejectReason.trim().length < 5) { toast.error('Rejection reason must be at least 5 characters'); return; }
    rejectLock.mutate(
      { marksIds: lockPendingIds, reason: rejectReason.trim() },
      { onSuccess: () => { setRejectReason(''); setShowRejectForm(false); } }
    );
  };

  const pendingCount = lockPendingIds.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review lock requests"
        description="Faculty submit lock requests when marks are finalised. Approve to lock them permanently, or reject to return for editing."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select class and exam</CardTitle>
          <CardDescription>Review lock-pending marks and take action.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name} — Grade {item.grade}{item.section}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedExamId}
            onValueChange={setSelectedExamId}
            disabled={!selectedClassId}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select exam" />
            </SelectTrigger>
            <SelectContent>
              {examItems.map((exam) => (
                <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              {approveLock.isPending ? 'Approving...' : `Approve lock (${pendingCount})`}
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
                placeholder="Enter reason for rejection (required, min 5 characters)"
                className="bg-white"
              />
              {rejectReason.length > 0 && rejectReason.trim().length < 5 && (
                <p className="text-xs text-red-600">Reason must be at least 5 characters.</p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={rejectLock.isPending || rejectReason.trim().length < 5}
                >
                  {rejectLock.isPending ? 'Rejecting...' : 'Confirm rejection'}
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
        {marksItems.map((item) => {
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
