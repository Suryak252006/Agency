'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { toast } from 'sonner';

function useCreateNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch('/api/v1/notices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notices'] }); toast.success('Notice created'); },
    onError: () => toast.error('Failed to create notice'),
  });
}

const NOTICE_TYPES = ['GENERAL', 'ACADEMIC', 'EXAM', 'FEE', 'EVENT', 'HOLIDAY', 'URGENT'];
const AUDIENCES = ['ALL', 'ADMIN_ONLY', 'FACULTY', 'PARENTS', 'STUDENTS', 'SPECIFIC_GRADES'];

export default function NewNoticePage() {
  const router = useRouter();
  const create = useCreateNotice();
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'GENERAL',
    audience: 'ALL',
    publishAt: '',
    expiresAt: '',
  });

  async function handleSubmit(e: React.FormEvent, publish = false) {
    e.preventDefault();
    const body: Record<string, unknown> = { ...form };
    if (!form.publishAt) delete body.publishAt;
    if (!form.expiresAt) delete body.expiresAt;
    const result = await create.mutateAsync(body);
    if (publish && result?.data?.notice?.id) {
      await fetch(`/api/v1/notices/${result.data.notice.id}/publish`, { method: 'POST' });
      toast.success('Notice published');
    }
    router.push('/admin/notices');
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New notice" description="Compose and optionally publish a school announcement." />

      <Card>
        <CardHeader><CardTitle>Notice details</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-5">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g. School closed on 15 Aug"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea
                rows={6}
                placeholder="Full notice content…"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NOTICE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select value={form.audience} onValueChange={(v) => setForm((f) => ({ ...f, audience: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map((a) => <SelectItem key={a} value={a}>{a.charAt(0) + a.slice(1).toLowerCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Publish date (optional)</Label>
                <Input type="datetime-local" value={form.publishAt} onChange={(e) => setForm((f) => ({ ...f, publishAt: e.target.value ? new Date(e.target.value).toISOString() : '' }))} />
              </div>
              <div className="space-y-2">
                <Label>Expiry date (optional)</Label>
                <Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : '' }))} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="button" variant="outline" disabled={create.isPending} onClick={(e) => handleSubmit(e, false)}>
                Save as draft
              </Button>
              <Button type="button" disabled={create.isPending} onClick={(e) => handleSubmit(e, true)}>
                {create.isPending ? 'Saving…' : 'Save & publish'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
