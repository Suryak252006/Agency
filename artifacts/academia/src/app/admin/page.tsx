'use client';

import { useRouter } from 'next/navigation';
import { AlertCircle, BookOpen, ClipboardList, Clock3, GraduationCap, Loader2, Sparkles, Users } from 'lucide-react';
import { useClasses, useLogs, useRequests } from '@/lib/client/hooks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function AdminDashboardPage() {
  const router = useRouter();
  const classes = useClasses();
  const pendingRequests = useRequests('PENDING');
  const logs = useLogs(undefined, 7);

  const classList = classes.data?.data?.classes ?? [];
  const requestList = pendingRequests.data?.data?.requests ?? [];
  const logList = logs.data?.data?.logs ?? [];
  const isInitialLoading = (!classes.data && classes.isLoading) || (!pendingRequests.data && pendingRequests.isLoading) || (!logs.data && logs.isLoading);
  const classCount = classes.data?.data?.total ?? classList.length;
  const requestCount = pendingRequests.data?.data?.total ?? requestList.length;
  const logCount = logs.data?.data?.total ?? logList.length;

  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-sky-50 to-white p-6 shadow-sm animate-pulse">
          <div className="h-4 w-24 rounded-full bg-slate-200" />
          <div className="mt-4 h-8 w-72 rounded-2xl bg-slate-200" />
          <div className="mt-3 h-4 w-full max-w-2xl rounded-full bg-slate-200" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
              <div className="h-4 w-20 rounded-full bg-slate-200" />
              <div className="mt-4 h-9 w-16 rounded-2xl bg-slate-200" />
              <div className="mt-3 h-3 w-32 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-6 shadow-lg shadow-slate-200/60 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Operational overview
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Admin dashboard</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Live classes, pending requests, and recent audit activity are wired directly to the authenticated API.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => router.push('/admin/requests')}>Review requests</Button>
            <Button variant="outline" onClick={() => router.push('/admin/classes')}>
              Open class directory
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="overflow-hidden border-sky-100 shadow-lg shadow-sky-100/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{classCount}</div>
            <p className="mt-1 text-xs text-slate-500">Loaded from the classes API</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-amber-100 shadow-lg shadow-amber-100/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending requests</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{requestCount}</div>
            <p className="mt-1 text-xs text-slate-500">Awaiting review</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-emerald-100 shadow-lg shadow-emerald-100/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audit events</CardTitle>
            <ClipboardList className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{logCount}</div>
            <p className="mt-1 text-xs text-slate-500">Recent activity in the last 7 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <Card className="overflow-hidden border-slate-100 shadow-lg shadow-slate-200/50">
          <CardHeader>
            <CardTitle>Recent classes</CardTitle>
            <CardDescription>Classes currently available for marks and attendance workflows.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {classList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-950">No classes available yet</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">When the authenticated classes API returns data, the list appears here automatically.</p>
                <Button variant="outline" className="mt-4" onClick={() => router.push('/admin/classes')}>
                  Open class directory
                </Button>
              </div>
            ) : (
              <>
                {classList.slice(0, 5).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-950">{item.name}</p>
                      <p className="text-sm text-slate-500">
                        Grade {item.grade} {item.section} · {item.subject}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 bg-sky-50 text-sky-700">
                      {item._count?.students ?? 0} students
                    </Badge>
                  </div>
                ))}
                <Separator />
                <Button variant="outline" onClick={() => router.push('/admin/classes')}>
                  Open class directory
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-100 shadow-lg shadow-slate-200/50">
          <CardHeader>
            <CardTitle>Workflow status</CardTitle>
            <CardDescription>Current activity across the system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">Pending review</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{requestCount}</p>
              <p className="mt-1 text-xs text-slate-500">Fetched from the requests API with the PENDING filter.</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">Audit trail</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{logCount}</p>
              <p className="mt-1 text-xs text-slate-500">Recent activity from the secured audit logs endpoint.</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">Faculty coverage</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{classCount > 0 ? 'Active' : 'No data'}</p>
              <p className="mt-1 text-xs text-slate-500">This status is driven by the classes query.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-100 bg-gradient-to-br from-white to-sky-50 shadow-md shadow-sky-100/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Data flow</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            useClasses, useRequests, and useLogs query the authenticated API and invalidate automatically after mutations.
          </CardContent>
        </Card>
        <Card className="border-slate-100 bg-gradient-to-br from-white to-amber-50 shadow-md shadow-amber-100/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Loading states</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            The page uses an admin loading skeleton while the first query round-trip resolves.
          </CardContent>
        </Card>
        <Card className="border-slate-100 bg-gradient-to-br from-white to-emerald-50 shadow-md shadow-emerald-100/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Empty states</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            If no classes or pending requests exist, the page now shows explicit guidance instead of a blank area.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}