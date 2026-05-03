'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { useGrades, useAcademicYears } from '@/lib/client/hooks';
import { toast } from 'sonner';

interface FeeStructure {
  id: string;
  amount: number;
  frequency: string;
  dueDay: number | null;
  isOptional: boolean;
  category: { id: string; name: string };
  grade: { id: string; name: string } | null;
  academicYear: { id: string; name: string } | null;
}

interface FeeCategory {
  id: string;
  name: string;
}

function useFeeStructures() {
  return useQuery<{ data: { structures: FeeStructure[] } }>({
    queryKey: ['fees', 'structures'],
    queryFn: () => fetch('/api/v1/fees/structure').then((r) => r.json()),
    staleTime: 30_000,
  });
}

function useFeeCategories() {
  return useQuery<{ data: { categories: FeeCategory[] } }>({
    queryKey: ['fees', 'categories'],
    queryFn: () => fetch('/api/v1/fees/categories').then((r) => r.json()),
    staleTime: 60_000,
  });
}

function useCreateFeeStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch('/api/v1/fees/structure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fees'] }); toast.success('Fee structure created'); },
    onError: () => toast.error('Failed to create fee structure'),
  });
}

const FREQUENCIES = ['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL'];

export default function AdminFeeStructurePage() {
  const structures = useFeeStructures();
  const categories = useFeeCategories();
  const grades = useGrades();
  const years = useAcademicYears();
  const create = useCreateFeeStructure();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ categoryId: '', gradeId: '', academicYearId: '', amount: '', frequency: 'MONTHLY', dueDay: '', isOptional: false });

  const items: FeeStructure[] = structures.data?.data?.structures ?? [];
  const catItems: FeeCategory[] = categories.data?.data?.categories ?? [];
  const gradeItems = (grades.data?.data?.grades ?? []) as Array<{ id: string; name: string }>;
  const yearItems = (years.data?.data?.academicYears ?? []) as Array<{ id: string; name: string }>;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = {
      categoryId: form.categoryId,
      amount: Number(form.amount),
      frequency: form.frequency,
      isOptional: form.isOptional,
    };
    if (form.gradeId) body.gradeId = form.gradeId;
    if (form.academicYearId) body.academicYearId = form.academicYearId;
    if (form.dueDay) body.dueDay = Number(form.dueDay);
    await create.mutateAsync(body);
    setOpen(false);
    setForm({ categoryId: '', gradeId: '', academicYearId: '', amount: '', frequency: 'MONTHLY', dueDay: '', isOptional: false });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Fee structure" description="Define fee amounts by category, grade, and academic year.">
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add structure
        </Button>
      </PageHeader>

      {structures.isError && <ErrorBanner message="Failed to load fee structures." />}

      <div className="grid gap-4">
        {structures.isPending ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-64 mt-1" /></CardHeader></Card>
          ))
        ) : items.length === 0 && !structures.isError ? (
          <EmptyState message="No fee structures defined. Add one to begin collecting fees." />
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{item.category.name}</CardTitle>
                    <CardDescription>
                      {item.grade ? `Grade: ${item.grade.name}` : 'All grades'}
                      {item.academicYear ? ` · ${item.academicYear.name}` : ''}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{item.frequency}</Badge>
                    {item.isOptional && <Badge variant="outline">Optional</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                ₹{item.amount.toLocaleString('en-IN')}
                {item.dueDay ? ` · due on ${item.dueDay}th` : ''}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add fee structure</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {catItems.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input type="number" min="1" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Frequency *</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm((f) => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((fr) => <SelectItem key={fr} value={fr}>{fr.replace('_', ' ').toLowerCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Grade (optional)</Label>
                <Select value={form.gradeId} onValueChange={(v) => setForm((f) => ({ ...f, gradeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="All grades" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All grades</SelectItem>
                    {gradeItems.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Academic year (optional)</Label>
                <Select value={form.academicYearId} onValueChange={(v) => setForm((f) => ({ ...f, academicYearId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Any year" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any year</SelectItem>
                    {yearItems.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Due day of month (optional)</Label>
              <Input type="number" min="1" max="31" placeholder="e.g. 10" value={form.dueDay} onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Optional fee</Label>
              <Switch checked={form.isOptional} onCheckedChange={(v) => setForm((f) => ({ ...f, isOptional: v }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending || !form.categoryId || !form.amount}>
                {create.isPending ? 'Saving…' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
