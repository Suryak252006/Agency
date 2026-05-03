'use client';

import { useState } from 'react';
import { AlertCircle, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { useAcademicYears } from '@/lib/client/hooks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Installment {
  id: string;
  amount: number;
  status: string;
  dueDate: string;
  student: { id: string; name: string; rollNo: string };
  category: { id: string; name: string };
  academicYear: { id: string; name: string };
}

function useFeeDues(academicYearId?: string, overdueOnly?: boolean) {
  const params = new URLSearchParams({ limit: '100' });
  if (academicYearId) params.set('academicYearId', academicYearId);
  if (overdueOnly) params.set('overdue', 'true');
  return useQuery<{ data: { installments: Installment[]; total: number; totalDue: number } }>({
    queryKey: ['fees', 'dues', academicYearId, overdueOnly],
    queryFn: () => fetch(`/api/v1/fees/dues?${params}`).then((r) => r.json()),
    staleTime: 30_000,
  });
}

export default function AdminFeeDuesPage() {
  const [search, setSearch] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [academicYearId, setAcademicYearId] = useState('');
  const years = useAcademicYears();
  const dues = useFeeDues(academicYearId || undefined, overdueOnly);
  const items: Installment[] = dues.data?.data?.installments ?? [];
  const yearItems = (years.data?.data?.academicYears ?? []) as Array<{ id: string; name: string }>;

  const filtered = search
    ? items.filter((i) =>
        i.student.name.toLowerCase().includes(search.toLowerCase()) ||
        i.student.rollNo.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const totalDue = dues.data?.data?.totalDue ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Fee dues" description="Students with pending or overdue fee installments." />

      {dues.isError && <ErrorBanner message="Failed to load fee dues." />}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by student name or roll no…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={academicYearId} onValueChange={setAcademicYearId}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All years</SelectItem>
            {yearItems.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch id="overdue-only" checked={overdueOnly} onCheckedChange={setOverdueOnly} />
          <Label htmlFor="overdue-only" className="text-sm">Overdue only</Label>
        </div>
      </div>

      {dues.data && (
        <Card>
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{filtered.length} pending installments</span>
            </div>
            <span className="font-semibold text-slate-900">Total due: ₹{Number(totalDue).toLocaleString('en-IN')}</span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {dues.isPending ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-64 mt-1" /></CardHeader></Card>
          ))
        ) : filtered.length === 0 && !dues.isError ? (
          <EmptyState message="No pending dues found." />
        ) : (
          filtered.map((inst) => (
            <Card key={inst.id}>
              <CardHeader className="pb-1 pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">{inst.student.name}</CardTitle>
                    <CardDescription className="text-xs">#{inst.student.rollNo} · {inst.category.name} · {inst.academicYear.name}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <div>
                      <div className="font-semibold text-sm">₹{Number(inst.amount).toLocaleString('en-IN')}</div>
                      <div className="text-xs text-slate-500">Due {new Date(inst.dueDate).toLocaleDateString('en-IN')}</div>
                    </div>
                    <Badge variant={inst.status === 'OVERDUE' ? 'destructive' : 'secondary'} className="text-xs">
                      {inst.status}
                    </Badge>
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
