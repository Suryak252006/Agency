'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';
import { ErrorBanner } from '@/components/error-banner';

interface ParentChild {
  student: { id: string; name: string; rollNo: string; email: string };
  relation: string;
  isPrimary: boolean;
}

interface Parent {
  id: string;
  fatherName: string | null;
  motherName: string | null;
  guardianName: string | null;
  primaryPhone: string;
  secondaryPhone: string | null;
  email: string | null;
  occupation: string | null;
  children: ParentChild[];
}

function useParent(id: string) {
  return useQuery<{ data: { parent: Parent } }>({
    queryKey: ['parents', id],
    queryFn: () => fetch(`/api/v1/parents/${id}`).then((r) => r.json()),
    staleTime: 30_000,
  });
}

export default function AdminParentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const query = useParent(id);
  const parent = query.data?.data?.parent;

  const displayName = parent
    ? (parent.fatherName ?? parent.motherName ?? parent.guardianName ?? parent.primaryPhone)
    : '—';

  return (
    <div className="space-y-6">
      <PageHeader title={displayName} description="Parent / guardian profile and linked students.">
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/parents')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </PageHeader>

      {query.isError && <ErrorBanner message="Failed to load parent details." />}

      {query.isPending ? (
        <Card><CardHeader><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-64 mt-1" /></CardHeader></Card>
      ) : parent ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-slate-400" />
                Contact information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {parent.fatherName && <div><span className="text-slate-500">Father: </span>{parent.fatherName}</div>}
              {parent.motherName && <div><span className="text-slate-500">Mother: </span>{parent.motherName}</div>}
              {parent.guardianName && <div><span className="text-slate-500">Guardian: </span>{parent.guardianName}</div>}
              <div><span className="text-slate-500">Primary phone: </span>{parent.primaryPhone}</div>
              {parent.secondaryPhone && <div><span className="text-slate-500">Secondary phone: </span>{parent.secondaryPhone}</div>}
              {parent.email && <div><span className="text-slate-500">Email: </span>{parent.email}</div>}
              {parent.occupation && <div><span className="text-slate-500">Occupation: </span>{parent.occupation}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Linked students</CardTitle>
              <CardDescription>{parent.children.length} student{parent.children.length !== 1 ? 's' : ''} linked</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {parent.children.length === 0 ? (
                <p className="text-sm text-slate-500">No students linked yet.</p>
              ) : (
                parent.children.map((ps) => (
                  <div key={ps.student.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                    <div>
                      <p className="font-medium text-sm">{ps.student.name}</p>
                      <p className="text-xs text-slate-500">{ps.student.email} · Roll #{ps.student.rollNo}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{ps.relation}</Badge>
                      {ps.isPrimary && <Badge variant="default">Primary</Badge>}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
