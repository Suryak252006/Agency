'use client';

import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';

interface Notice {
  id: string;
  title: string;
  type: string;
  targetAudience: string;
  createdAt: string;
  expiresAt: string | null;
}

function useNotices() {
  return useQuery<{ data: { notices: Notice[]; total: number } }>({
    queryKey: ['faculty', 'notices'],
    queryFn: () => fetch('/api/v1/notices?limit=50').then((r) => r.json()),
    staleTime: 60_000,
  });
}

const TYPE_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  URGENT: 'destructive', EXAM: 'default', GENERAL: 'secondary',
  HOLIDAY: 'secondary', EVENT: 'default', ACADEMIC: 'secondary', FEE: 'outline',
};

export default function FacultyNoticesPage() {
  const notices = useNotices();
  const items: Notice[] = notices.data?.data?.notices ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Notices" description="School announcements and communications." />

      {notices.isError && <ErrorBanner message="Failed to load notices." />}

      <div className="grid gap-4">
        {notices.isPending ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-64 mt-1" /></CardHeader></Card>
          ))
        ) : items.length === 0 && !notices.isError ? (
          <EmptyState message="No notices at this time." />
        ) : (
          items.map((notice) => (
            <Card key={notice.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Bell className="h-4 w-4 text-slate-400" />
                      {notice.title}
                    </CardTitle>
                    <CardDescription>
                      {new Date(notice.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                      {notice.expiresAt && ` · expires ${new Date(notice.expiresAt).toLocaleDateString('en-IN')}`}
                    </CardDescription>
                  </div>
                  <Badge variant={TYPE_COLORS[notice.type] ?? 'secondary'}>{notice.type}</Badge>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
