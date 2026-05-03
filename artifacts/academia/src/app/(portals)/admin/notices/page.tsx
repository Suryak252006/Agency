'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Bell, Eye, EyeOff } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { toast } from 'sonner';

interface Notice {
  id: string;
  title: string;
  type: string;
  targetAudience: string;
  isPublished: boolean;
  publishedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

function useNotices() {
  return useQuery<{ data: { notices: Notice[]; total: number } }>({
    queryKey: ['notices'],
    queryFn: () => fetch('/api/v1/notices?limit=50').then((r) => r.json()),
    staleTime: 30_000,
  });
}

function usePublishNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/v1/notices/${id}/publish`, { method: 'POST' }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notices'] }); toast.success('Notice published'); },
    onError: () => toast.error('Failed to publish notice'),
  });
}

function typeColor(type: string) {
  const map: Record<string, string> = {
    GENERAL: 'secondary', ACADEMIC: 'secondary', EXAM: 'default', HOLIDAY: 'secondary',
    EVENT: 'default', URGENT: 'destructive', FEE: 'outline',
  };
  return (map[type] ?? 'secondary') as 'secondary' | 'default' | 'destructive' | 'outline';
}

export default function AdminNoticesPage() {
  const router = useRouter();
  const notices = useNotices();
  const publish = usePublishNotice();
  const items: Notice[] = notices.data?.data?.notices ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Notices" description="Create and publish school-wide announcements.">
        <Button onClick={() => router.push('/admin/notices/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New notice
        </Button>
      </PageHeader>

      {notices.isError && <ErrorBanner message="Failed to load notices." />}

      <div className="grid gap-4">
        {notices.isPending ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-64 mt-1" /></CardHeader></Card>
          ))
        ) : items.length === 0 && !notices.isError ? (
          <EmptyState message="No notices yet. Create one to communicate with parents, students, and faculty." />
        ) : (
          items.map((notice) => (
            <Card key={notice.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Bell className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="truncate">{notice.title}</span>
                    </CardTitle>
                    <CardDescription>
                      {new Date(notice.createdAt).toLocaleDateString('en-IN')}
                      {notice.expiresAt && ` · expires ${new Date(notice.expiresAt).toLocaleDateString('en-IN')}`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={typeColor(notice.type)}>{notice.type}</Badge>
                    <Badge variant="outline">{notice.targetAudience}</Badge>
                    {notice.isPublished ? (
                      <Badge variant="default" className="gap-1"><Eye className="h-3 w-3" />Published</Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1"><EyeOff className="h-3 w-3" />Draft</Badge>
                    )}
                    {!notice.isPublished && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={publish.isPending}
                        onClick={() => publish.mutate(notice.id)}
                      >
                        Publish
                      </Button>
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
