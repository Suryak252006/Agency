'use client';

import { useState } from 'react';
import { Award, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { useAcademicYears } from '@/lib/client/hooks';
import { toast } from 'sonner';

interface RCConfig {
  id: string;
  template: string;
  showAttendance: boolean;
  showRemarks: boolean;
  term: { id: string; name: string; examType: string } | null;
  grade: { id: string; name: string } | null;
}

function useReportCardConfigs() {
  return useQuery<{ data: { configs: RCConfig[] } }>({
    queryKey: ['report-cards', 'configs'],
    queryFn: () => fetch('/api/v1/report-cards/config').then((r) => r.json()),
    staleTime: 30_000,
  });
}

function useCreateReportCardConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch('/api/v1/report-cards/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['report-cards'] }); toast.success('Config created'); },
    onError: () => toast.error('Failed to create config'),
  });
}

const TEMPLATES = ['CBSE_10_POINT', 'ICSE_PERCENT', 'STATE_BOARD_PERCENT', 'CUSTOM'];

export default function AdminReportCardsPage() {
  const configs = useReportCardConfigs();
  const create = useCreateReportCardConfig();
  const years = useAcademicYears();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ academicYearId: '', template: 'CBSE_10_POINT', includeAttendance: true, includeRemarks: true });

  const items: RCConfig[] = configs.data?.data?.configs ?? [];
  const yearItems = (years.data?.data?.academicYears ?? []) as Array<{ id: string; name: string }>;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await create.mutateAsync(form);
    setOpen(false);
    setForm({ academicYearId: '', template: 'CBSE_10_POINT', includeAttendance: true, includeRemarks: true });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Report cards" description="Configure report card templates for each academic year.">
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New config
        </Button>
      </PageHeader>

      {configs.isError && <ErrorBanner message="Failed to load report card configs." />}

      <div className="grid gap-4">
        {configs.isPending ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-64 mt-1" /></CardHeader></Card>
          ))
        ) : items.length === 0 && !configs.isError ? (
          <EmptyState message="No report card configurations yet. Create one to get started." />
        ) : (
          items.map((config) => (
            <Card key={config.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="h-4 w-4 text-slate-400" />
                      {config.grade?.name ?? '—'}{config.term ? ` · ${config.term.name}` : ''}
                    </CardTitle>
                    <CardDescription>Template: {config.template}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {config.showAttendance && <Badge variant="secondary">Attendance</Badge>}
                    {config.showRemarks && <Badge variant="secondary">Remarks</Badge>}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create report card config</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Academic year *</Label>
              <Select value={form.academicYearId} onValueChange={(v) => setForm((f) => ({ ...f, academicYearId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>
                  {yearItems.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={form.template} onValueChange={(v) => setForm((f) => ({ ...f, template: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => <SelectItem key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Include attendance</Label>
              <Switch checked={form.includeAttendance} onCheckedChange={(v) => setForm((f) => ({ ...f, includeAttendance: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Include remarks</Label>
              <Switch checked={form.includeRemarks} onCheckedChange={(v) => setForm((f) => ({ ...f, includeRemarks: v }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending || !form.academicYearId}>
                {create.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
