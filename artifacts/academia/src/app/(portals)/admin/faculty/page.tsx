'use client';

import { useState } from 'react';
import { Users, Search, UserCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';

interface FacultyMember {
  id: string;
  user: { id: string; name: string; email: string; role: string };
  departments: Array<{ department: { id: string; name: string }; primary: boolean }>;
  classes: Array<{ id: string; name: string }>;
}

function useFaculty(search?: string) {
  const params = new URLSearchParams({ limit: '50' });
  if (search) params.set('search', search);
  return useQuery<{ data: { faculty: FacultyMember[]; total: number } }>({
    queryKey: ['faculty', search],
    queryFn: () => fetch(`/api/v1/faculty?${params}`).then((r) => r.json()),
    staleTime: 30_000,
  });
}

const ROLE_LABELS: Record<string, string> = {
  faculty: 'Faculty',
  hod: 'HOD',
  admin: 'Admin',
};

export default function AdminFacultyPage() {
  const [search, setSearch] = useState('');
  const faculty = useFaculty(search || undefined);
  const items: FacultyMember[] = faculty.data?.data?.faculty ?? [];
  const total = faculty.data?.data?.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Faculty" description={`${total} staff member${total !== 1 ? 's' : ''} registered.`} />

      {faculty.isError && <ErrorBanner message="Failed to load faculty list." />}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search by name or email…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {faculty.isPending ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56 mt-1" />
              </CardHeader>
            </Card>
          ))
        ) : items.length === 0 && !faculty.isError ? (
          <div className="col-span-2">
            <EmptyState message="No faculty members found." />
          </div>
        ) : (
          items.map((member) => (
            <Card key={member.id} className="hover:border-slate-300 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center">
                      <UserCheck className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{member.user.name}</CardTitle>
                      <CardDescription>{member.user.email}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary">{ROLE_LABELS[member.user.role] ?? member.user.role}</Badge>
                </div>
              </CardHeader>
              {(member.departments.length > 0 || member.classes.length > 0) && (
                <CardContent className="pt-0 flex flex-wrap gap-1">
                  {member.departments.map((d) => (
                    <Badge key={d.department.id} variant={d.primary ? 'default' : 'outline'} className="text-xs">
                      {d.department.name}
                    </Badge>
                  ))}
                  {member.classes.map((c) => (
                    <Badge key={c.id} variant="outline" className="text-xs text-slate-500">
                      {c.name}
                    </Badge>
                  ))}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {total > 50 && (
        <p className="text-center text-sm text-slate-500">Showing first 50 of {total} staff members.</p>
      )}
    </div>
  );
}
