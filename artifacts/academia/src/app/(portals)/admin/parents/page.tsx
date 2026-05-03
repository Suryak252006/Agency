'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, UserCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ParentChild {
  student: { id: string; name: string; rollNo: string };
  relation: string;
  isPrimary: boolean;
}

interface Parent {
  id: string;
  fatherName: string | null;
  motherName: string | null;
  guardianName: string | null;
  primaryPhone: string;
  email: string | null;
  children: ParentChild[];
}

function displayName(p: Parent): string {
  return p.fatherName ?? p.motherName ?? p.guardianName ?? p.primaryPhone;
}

function useParents(search?: string) {
  const params = new URLSearchParams({ limit: '50' });
  if (search) params.set('search', search);
  return useQuery<{ data: { parents: Parent[]; total: number } }>({
    queryKey: ['parents', search],
    queryFn: () => fetch(`/api/v1/parents?${params}`).then((r) => r.json()),
    staleTime: 30_000,
  });
}

function useCreateParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch('/api/v1/parents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['parents'] }); toast.success('Parent added'); },
    onError: () => toast.error('Failed to add parent'),
  });
}

export default function AdminParentsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fatherName: '', motherName: '', guardianName: '', primaryPhone: '', email: '', occupation: '' });

  const parents = useParents(debouncedSearch || undefined);
  const create = useCreateParent();

  const items: Parent[] = parents.data?.data?.parents ?? [];

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    clearTimeout((window as unknown as { _pst?: ReturnType<typeof setTimeout> })._pst);
    (window as unknown as { _pst?: ReturnType<typeof setTimeout> })._pst = setTimeout(() => setDebouncedSearch(e.target.value), 350);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = { primaryPhone: form.primaryPhone };
    if (form.fatherName) body.fatherName = form.fatherName;
    if (form.motherName) body.motherName = form.motherName;
    if (form.guardianName) body.guardianName = form.guardianName;
    if (form.email) body.email = form.email;
    if (form.occupation) body.occupation = form.occupation;
    await create.mutateAsync(body);
    setOpen(false);
    setForm({ fatherName: '', motherName: '', guardianName: '', primaryPhone: '', email: '', occupation: '' });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Parents" description="Manage parent and guardian records linked to students.">
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add parent
        </Button>
      </PageHeader>

      {parents.isError && <ErrorBanner message="Failed to load parents." />}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search by name, email, or phone…"
          className="pl-9"
          value={search}
          onChange={handleSearchChange}
        />
      </div>

      <div className="grid gap-4">
        {parents.isPending ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-64 mt-1" /></CardHeader></Card>
          ))
        ) : items.length === 0 && !parents.isError ? (
          <EmptyState message="No parents found. Add one to get started." />
        ) : (
          items.map((parent) => (
            <Card key={parent.id} className="cursor-pointer hover:border-slate-300 transition-colors" onClick={() => router.push(`/admin/parents/${parent.id}`)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-slate-400" />
                      {displayName(parent)}
                    </CardTitle>
                    <CardDescription>
                      {parent.primaryPhone}
                      {parent.email ? ` · ${parent.email}` : ''}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{parent.children.length} student{parent.children.length !== 1 ? 's' : ''}</Badge>
                </div>
              </CardHeader>
              {parent.children.length > 0 && (
                <CardContent className="text-sm text-slate-600 pt-0">
                  {parent.children.map((ps) => (
                    <span key={ps.student.id} className="mr-3">
                      {ps.student.name} ({ps.student.rollNo})
                      {ps.isPrimary && <span className="ml-1 text-xs text-sky-600">primary</span>}
                    </span>
                  ))}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add parent / guardian</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Primary phone *</Label>
              <Input value={form.primaryPhone} onChange={(e) => setForm((f) => ({ ...f, primaryPhone: e.target.value }))} required placeholder="+91 98765 43210" />
            </div>
            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-2">
                <Label>Father's name</Label>
                <Input value={form.fatherName} onChange={(e) => setForm((f) => ({ ...f, fatherName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Mother's name</Label>
                <Input value={form.motherName} onChange={(e) => setForm((f) => ({ ...f, motherName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Guardian name</Label>
              <Input value={form.guardianName} onChange={(e) => setForm((f) => ({ ...f, guardianName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Occupation</Label>
              <Input value={form.occupation} onChange={(e) => setForm((f) => ({ ...f, occupation: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending || !form.primaryPhone}>
                {create.isPending ? 'Saving…' : 'Add parent'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
