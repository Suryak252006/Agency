'use client';

import { useState } from 'react';
import { Plus, Building2, Users, BookOpen } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { toast } from 'sonner';

interface Department {
  id: string;
  name: string;
  code: string | null;
  head: { id: string; name: string } | null;
  _count: { faculty: number; exams: number };
}

function useDepartments() {
  return useQuery<{ data: { departments: Department[] } }>({
    queryKey: ['departments'],
    queryFn: () => fetch('/api/v1/departments').then((r) => r.json()),
    staleTime: 30_000,
  });
}

function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; code?: string }) =>
      fetch('/api/v1/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('Department created'); },
    onError: () => toast.error('Failed to create department'),
  });
}

export default function AdminDepartmentsPage() {
  const departments = useDepartments();
  const create = useCreateDepartment();
  const items: Department[] = departments.data?.data?.departments ?? [];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '' });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await create.mutateAsync({ name: form.name, code: form.code || undefined });
    setOpen(false);
    setForm({ name: '', code: '' });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Departments" description="Manage school departments and their heads.">
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add department
        </Button>
      </PageHeader>

      {departments.isError && <ErrorBanner message="Failed to load departments." />}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {departments.isPending ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48 mt-1" /></CardHeader></Card>
          ))
        ) : items.length === 0 && !departments.isError ? (
          <div className="col-span-3">
            <EmptyState message="No departments found. Add one to begin." />
          </div>
        ) : (
          items.map((dept) => (
            <Card key={dept.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{dept.name}</CardTitle>
                    {dept.code && <CardDescription>{dept.code}</CardDescription>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />{dept._count.faculty} faculty
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" />{dept._count.exams} exams
                </span>
                {dept.head && <span className="ml-auto font-medium text-slate-700">{dept.head.name}</span>}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add department</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Mathematics"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Code (optional)</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="e.g. MATH"
                maxLength={20}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending || !form.name}>
                {create.isPending ? 'Saving…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
