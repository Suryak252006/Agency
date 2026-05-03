'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CalendarDays, Lock, Plus, Star, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { AcademicYearRecord } from '@/schemas';
import {
  useAcademicYears,
  useCreateAcademicYear,
  useSetCurrentAcademicYear,
  useLockAcademicYear,
  useDeleteAcademicYear,
} from '@/lib/client/hooks';
import { PageHeader } from '@/components/page-header';

export default function AcademicYearsPage() {
  const { data, isLoading } = useAcademicYears();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });

  const createMutation = useCreateAcademicYear();
  const setCurrentMutation = useSetCurrentAcademicYear();
  const lockMutation = useLockAcademicYear();
  const deleteMutation = useDeleteAcademicYear();

  const years: AcademicYearRecord[] = data?.data?.academicYears ?? [];

  const handleCreate = () => {
    if (!form.name || !form.startDate || !form.endDate) {
      toast.error('All fields are required');
      return;
    }
    createMutation.mutate(
      {
        name: form.name,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      },
      {
        onSuccess: () => {
          toast.success('Academic year created');
          setShowCreate(false);
          setForm({ name: '', startDate: '', endDate: '' });
        },
      },
    );
  };

  const handleSetCurrent = (id: string) => {
    setCurrentMutation.mutate({ id }, {
      onSuccess: () => toast.success('Set as current year'),
    });
  };

  const handleLock = (id: string) => {
    lockMutation.mutate({ id }, {
      onSuccess: () => toast.success('Academic year locked'),
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => toast.success('Deleted'),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 rounded-3xl border border-slate-200 bg-white animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Years"
        description="Manage school years and their exam terms."
        titleClassName="text-2xl"
        descriptionClassName="mt-1 text-sm text-slate-500"
      >
        <Button onClick={() => setShowCreate((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          New academic year
        </Button>
      </PageHeader>

      {showCreate && (
        <Card className="border-sky-100">
          <CardHeader>
            <CardTitle className="text-base">Create academic year</CardTitle>
            <CardDescription>Format: 2024-25</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                placeholder="2024-25"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End date</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 sm:col-span-3">
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {years.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <CalendarDays className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No academic years yet. Create your first one.</p>
        </div>
      )}

      {years.map((year) => (
        <Card key={year.id} className={`border-slate-100 ${year.isCurrent ? 'border-sky-200 shadow-sky-100/40 shadow-lg' : ''}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-slate-400" />
                <div>
                  <CardTitle className="text-base">{year.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {new Date(year.startDate).toLocaleDateString()} → {new Date(year.endDate).toLocaleDateString()}
                  </CardDescription>
                </div>
                {year.isCurrent && <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">Current</Badge>}
                {year.isLocked && <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Locked</Badge>}
              </div>
              <div className="flex gap-2">
                {!year.isCurrent && !year.isLocked && (
                  <Button size="sm" variant="outline" onClick={() => handleSetCurrent(year.id)}>
                    <Star className="mr-1 h-3.5 w-3.5" />
                    Set current
                  </Button>
                )}
                {!year.isLocked && (
                  <Button size="sm" variant="outline" onClick={() => handleLock(year.id)}>
                    <Lock className="mr-1 h-3.5 w-3.5" />
                    Lock
                  </Button>
                )}
                {!year.isLocked && !year.isCurrent && (
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(year.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          {year.terms.length > 0 && (
            <CardContent>
              <Separator className="mb-4" />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {year.terms.map((term) => (
                  <div key={term.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="text-sm font-medium text-slate-800">{term.name}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      <span>{term.examType.replace('_', ' ')}</span>
                      <span>·</span>
                      <span>{term.weightage}%</span>
                      {term.isPublished && <Badge className="ml-auto h-4 bg-green-100 px-1.5 text-[10px] text-green-700 hover:bg-green-100">Published</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
