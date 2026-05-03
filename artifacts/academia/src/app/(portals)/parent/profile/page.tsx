'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';
import { ErrorBanner } from '@/components/error-banner';
import { User, Users, Phone, Mail } from 'lucide-react';

interface ParentProfile {
  id: string;
  fatherName: string | null;
  motherName: string | null;
  guardianName: string | null;
  primaryPhone: string;
  email: string | null;
  address: string | null;
  children: Array<{
    student: { id: string; name: string; rollNo: string; currentGradeId: string | null; isActive: boolean };
  }>;
}

function useParentProfile() {
  return useQuery<{ data: { parent: ParentProfile } }>({
    queryKey: ['parent', 'profile'],
    queryFn: () => fetch('/api/v1/parents/me').then((r) => r.json()),
    staleTime: 120_000,
  });
}

function useChildren() {
  return useQuery<{ data: { children: Array<{ id: string; name: string; rollNo: string }> } }>({
    queryKey: ['parent', 'children'],
    queryFn: () => fetch('/api/v1/parent/children').then((r) => r.json()),
    staleTime: 60_000,
  });
}

export default function ParentProfilePage() {
  const profile = useParentProfile();
  const children = useChildren();
  const p = profile.data?.data?.parent;
  const childItems = children.data?.data?.children ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Your account details and linked children." />

      {(profile.isError || children.isError) && <ErrorBanner message="Failed to load profile." />}

      {profile.isPending ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64 mt-1" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </CardContent>
        </Card>
      ) : p ? (
        <Card>
          <CardHeader className="flex flex-row items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
              <User className="h-6 w-6 text-slate-500" />
            </div>
            <div>
              <CardTitle>
                {p.fatherName ?? p.motherName ?? p.guardianName ?? 'Parent'}
              </CardTitle>
              <CardDescription>Parent / Guardian</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm">
              {p.fatherName && (
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Father</span>
                  <span className="font-medium">{p.fatherName}</span>
                </div>
              )}
              {p.motherName && (
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Mother</span>
                  <span className="font-medium">{p.motherName}</span>
                </div>
              )}
              {p.guardianName && (
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Guardian</span>
                  <span className="font-medium">{p.guardianName}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="h-3.5 w-3.5" />
                <span>{p.primaryPhone}</span>
              </div>
              {p.email && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{p.email}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            Linked children
          </CardTitle>
          <CardDescription>{childItems.length} child{childItems.length !== 1 ? 'ren' : ''} linked to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {children.isPending ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
          ) : childItems.length === 0 ? (
            <p className="text-sm text-slate-500">No children linked. Contact the school to link your children.</p>
          ) : (
            childItems.map((child) => (
              <div key={child.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                <div>
                  <p className="text-sm font-medium">{child.name}</p>
                  <p className="text-xs text-slate-500">Roll No: {child.rollNo}</p>
                </div>
                <Badge variant="secondary">Active</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
