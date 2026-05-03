'use client';

import { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';

interface Child { id: string; name: string; rollNo: string }

function useChildren() {
  return useQuery<{ data: { children: Child[] } }>({
    queryKey: ['parent', 'children'],
    queryFn: () => fetch('/api/v1/parent/children').then((r) => r.json()),
    staleTime: 60_000,
  });
}

function useChildMarks(studentId?: string) {
  return useQuery<{ data: { marks: Array<{ id: string; value: string; exam: { name: string; maxMarks: number; startDate: string } }> } }>({
    queryKey: ['parent', 'report-cards', studentId],
    queryFn: () => fetch(`/api/v1/parent/children/${studentId}/marks`).then((r) => r.json()),
    enabled: !!studentId,
    staleTime: 60_000,
  });
}

export default function ParentReportCardsPage() {
  const children = useChildren();
  const childItems: Child[] = children.data?.data?.children ?? [];
  const [selectedId, setSelectedId] = useState('');
  const activeId = selectedId || childItems[0]?.id;
  const marks = useChildMarks(activeId);
  const markItems = marks.data?.data?.marks ?? [];

  const activeChild = childItems.find((c) => c.id === activeId);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Report cards" description="View locked exam results for your child.">
        {markItems.length > 0 && (
          <Button variant="outline" onClick={handlePrint}>
            <Download className="mr-2 h-4 w-4" />
            Print
          </Button>
        )}
      </PageHeader>

      {(children.isError || marks.isError) && <ErrorBanner message="Failed to load report card data." />}

      {childItems.length > 1 && (
        <Select value={activeId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select child" />
          </SelectTrigger>
          <SelectContent>
            {childItems.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {activeChild && markItems.length > 0 && (
        <Card className="print:shadow-none print:border-0">
          <CardHeader>
            <CardTitle>Report card — {activeChild.name}</CardTitle>
            <CardDescription>Roll No: {activeChild.rollNo}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {markItems.map((m) => (
                <div key={m.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{m.exam.name}</p>
                    <p className="text-xs text-slate-500">{new Date(m.exam.startDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">{m.value}</span>
                    <span className="text-slate-500 text-sm">/ {m.exam.maxMarks}</span>
                    <Badge variant="secondary" className="text-xs">
                      {m.exam.maxMarks > 0 ? `${((parseFloat(m.value) / m.exam.maxMarks) * 100).toFixed(1)}%` : '—'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {marks.isPending && activeId && (
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32 mt-1" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent>
        </Card>
      )}

      {!marks.isPending && markItems.length === 0 && activeId && (
        <EmptyState message="No published report cards available yet. Check back after exams are finalized." />
      )}

      {!activeId && !children.isPending && (
        <EmptyState message="No children linked to your account." />
      )}
    </div>
  );
}
