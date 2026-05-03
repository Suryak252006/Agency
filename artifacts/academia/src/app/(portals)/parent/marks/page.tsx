'use client';

import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';

interface Child {
  id: string;
  name: string;
  rollNo: string;
}

interface MarkRecord {
  id: string;
  value: string;
  status: string;
  exam: { id: string; name: string; maxMarks: number; startDate: string };
}

function useChildren() {
  return useQuery<{ data: { children: Child[] } }>({
    queryKey: ['parent', 'children'],
    queryFn: () => fetch('/api/v1/parent/children').then((r) => r.json()),
    staleTime: 60_000,
  });
}

function useChildMarks(studentId?: string) {
  return useQuery<{ data: { marks: MarkRecord[] } }>({
    queryKey: ['parent', 'marks', studentId],
    queryFn: () => fetch(`/api/v1/parent/children/${studentId}/marks`).then((r) => r.json()),
    enabled: !!studentId,
    staleTime: 60_000,
  });
}

function scoreColor(value: string, max: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  const num = parseFloat(value);
  if (isNaN(num)) return 'secondary';
  const pct = (num / max) * 100;
  if (pct >= 75) return 'default';
  if (pct >= 50) return 'secondary';
  return 'destructive';
}

export default function ParentMarksPage() {
  const children = useChildren();
  const childItems: Child[] = children.data?.data?.children ?? [];
  const [selectedId, setSelectedId] = useState<string>('');
  const activeId = selectedId || childItems[0]?.id;

  const marksQuery = useChildMarks(activeId);
  const marks: MarkRecord[] = marksQuery.data?.data?.marks ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Marks" description="Exam results and performance overview." />

      {(children.isError || marksQuery.isError) && <ErrorBanner message="Failed to load marks data." />}

      {childItems.length > 1 && (
        <Select value={activeId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select child" />
          </SelectTrigger>
          <SelectContent>
            {childItems.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="grid gap-4">
        {children.isPending || marksQuery.isPending ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-64 mt-1" /></CardHeader></Card>
          ))
        ) : marks.length === 0 ? (
          <EmptyState message="No exam results available yet." />
        ) : (
          marks.map((mark) => (
            <Card key={mark.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-slate-400" />
                      {mark.exam.name}
                    </CardTitle>
                    <CardDescription>
                      {new Date(mark.exam.startDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                      {' · '}Max {mark.exam.maxMarks} marks
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={scoreColor(mark.value, mark.exam.maxMarks)}>
                      {mark.value} / {mark.exam.maxMarks}
                    </Badge>
                    {mark.status !== 'LOCKED' && (
                      <Badge variant="outline">{mark.status.toLowerCase()}</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
