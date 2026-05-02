'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, ClipboardList, FileText, Layers } from 'lucide-react';
import { useClasses, useRequests } from '@/lib/client/hooks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function FacultyDashboardPage() {
  const router = useRouter();
  const classes = useClasses();
  const requests = useRequests();
  const [nextClassHref, setNextClassHref] = useState('/faculty/classes');

  useEffect(() => {
    const firstClassId = classes.data?.data?.classes?.[0]?.id;
    if (firstClassId) {
      setNextClassHref(`/faculty/classes?classId=${firstClassId}`);
    }
  }, [classes.data]);

  const classCount = classes.data?.data?.total ?? classes.data?.data?.classes?.length ?? 0;
  const requestCount = requests.data?.data?.total ?? requests.data?.data?.requests?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Faculty</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Your classes</h1>
          <p className="mt-2 text-sm text-slate-600">Continue entering marks, reviewing requests, and tracking progress.</p>
        </div>
        <Button onClick={() => router.push(nextClassHref)}>Open marks workflow</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned classes</CardTitle>
            <BookOpen className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{classCount}</div>
            <p className="mt-1 text-xs text-slate-500">Available for marks entry</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requests</CardTitle>
            <Layers className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{requestCount}</div>
            <p className="mt-1 text-xs text-slate-500">All request types in your queue</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Current classes</CardTitle>
            <CardDescription>Use these sections to continue marks entry for assigned classes only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(classes.data?.data?.classes ?? []).slice(0, 5).map((item: any) => (
              <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
                <div>
                  <p className="font-medium text-slate-950">{item.name}</p>
                  <p className="text-sm text-slate-500">
                    Grade {item.grade} {item.section} · {item.subject}
                  </p>
                </div>
                <Badge variant="secondary">Open</Badge>
              </div>
            ))}
            <Separator />
            <Button variant="outline" onClick={() => router.push(nextClassHref)}>
              Open marks workflow
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fast actions</CardTitle>
            <CardDescription>Shortcuts for the most common tasks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => router.push('/faculty/requests')}>
              <ClipboardList className="h-4 w-4" />
              Review requests
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => router.push(nextClassHref)}>
              <FileText className="h-4 w-4" />
              Enter marks
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
