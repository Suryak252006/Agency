'use client';

import { useState } from 'react';
import { Plus, BookOpen, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { toast } from 'sonner';

interface Exam {
  id: string;
  name: string;
  maxMarks: number;
  startDate: string;
  endDate: string | null;
  department: { id: string; name: string };
  class: { id: string; name: string } | null;
  _count: { marks: number };
}

interface Department { id: string; name: string }

function useExams(search?: string) {
  const params = new URLSearchParams({ limit: '50' });
  if (search) params.set('search', search);
  return useQuery<{ data: { exams: Exam[] } }>({
    queryKey: ['exams', search],
    queryFn: () => fetch(`/api/v1/exams?${params}`).then((r) => r.json()),
    staleTime: 30_000,
  });
}

function useDepartments() {
  return useQuery<{ data: { departments: Department[] } }>({
    queryKey: ['departments'],
    queryFn: () => fetch('/api/v1/departments').then((r) => r.json()),
    staleTime: 60_000,
  });
}

function useCreateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch('/api/v1/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exams'] }); toast.success('Exam created'); },
    onError: () => toast.error('Failed to create exam'),
  });
}

export default function AdminExamsPage() {
  const [search, setSearch] = useState('');
  const exams = useExams(search || undefined);
  const departments = useDepartments();
  const create = useCreateExam();
  const items: Exam[] = exams.data?.data?.exams ?? [];
  const deptItems: Department[] = departments.data?.data?.departments ?? [];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', departmentId: '', maxMarks: '100', startDate: '', endDate: '' });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = {
      name: form.name,
      departmentId: form.departmentId,
      maxMarks: Number(form.maxMarks),
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
    };
    if (form.endDate) body.endDate = new Date(form.endDate).toISOString();
    await create.mutateAsync(body);
    setOpen(false);
    setForm({ name: '', departmentId: '', maxMarks: '100', startDate: '', endDate: '' });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Exams" description="Manage school examinations and assessments.">
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create exam
        </Button>
      </PageHeader>

      {exams.isError && <ErrorBanner message="Failed to load exams." />}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search exams…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {exams.isPending ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-64 mt-1" /></CardHeader></Card>
          ))
        ) : items.length === 0 && !exams.isError ? (
          <EmptyState message="No exams found. Create one to begin." />
        ) : (
          items.map((exam) => (
            <Card key={exam.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-slate-400" />
                      {exam.name}
                    </CardTitle>
                    <CardDescription>
                      {exam.department.name}
                      {exam.class ? ` · ${exam.class.name}` : ''}
                      {' · '}
                      {new Date(exam.startDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Max: {exam.maxMarks}</Badge>
                    <Badge variant="outline">{exam._count.marks} entries</Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create exam</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Exam name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Unit Test 1 — Mathematics" required />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select value={form.departmentId} onValueChange={(v) => setForm((f) => ({ ...f, departmentId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {deptItems.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max marks *</Label>
                <Input type="number" min="1" value={form.maxMarks} onChange={(e) => setForm((f) => ({ ...f, maxMarks: e.target.value }))} required />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Start date *</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>End date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending || !form.name || !form.departmentId || !form.startDate}>
                {create.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
