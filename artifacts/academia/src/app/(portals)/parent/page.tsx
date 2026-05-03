'use client';

import Link from 'next/link';
import { CalendarCheck, CreditCard, Bell, BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';

function useParentNotices() {
  return useQuery<{ data: { notices: Array<{ id: string; title: string; type: string; createdAt: string }>; total: number } }>({
    queryKey: ['parent', 'notices'],
    queryFn: () => fetch('/api/v1/notices/feed?limit=5').then((r) => r.json()),
    staleTime: 60_000,
  });
}

export default function ParentDashboardPage() {
  const notices = useParentNotices();
  const noticeItems = notices.data?.data?.notices ?? [];
  const noticeCount = notices.data?.data?.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parent dashboard"
        description="An overview of your child's school activity."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Attendance', icon: CalendarCheck, href: '/parent/attendance', desc: 'View attendance records' },
          { label: 'Marks', icon: BookOpen, href: '/parent/marks', desc: 'View exam results' },
          { label: 'Fees', icon: CreditCard, href: '/parent/fees', desc: 'Check fee status' },
          { label: 'Notices', icon: Bell, href: '/parent/notices', desc: `${noticeCount} announcement${noticeCount !== 1 ? 's' : ''}` },
        ].map(({ label, icon: Icon, href, desc }) => (
          <Link key={href} href={href}>
            <Card className="cursor-pointer hover:border-slate-300 transition-colors h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-500">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent notices</CardTitle>
          <CardDescription>Latest announcements from the school</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {noticeItems.length === 0 ? (
            <p className="text-sm text-slate-500">No recent notices.</p>
          ) : (
            noticeItems.map((notice) => (
              <div key={notice.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{notice.title}</p>
                  <p className="text-xs text-slate-500">{new Date(notice.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <Badge variant="secondary">{notice.type}</Badge>
              </div>
            ))
          )}
          {noticeCount > 5 && (
            <Link href="/parent/notices" className="block text-sm text-sky-600 hover:underline pt-1">
              View all {noticeCount} notices →
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
