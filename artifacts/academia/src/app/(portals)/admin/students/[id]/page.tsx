'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';
import { ErrorBanner } from '@/components/error-banner';
import { EmptyState } from '@/components/empty-state';
import { CalendarCheck, CreditCard, BookOpen, User } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
  rollNo: string;
  admissionNo: string | null;
  gender: string | null;
  isActive: boolean;
  currentGradeId: string | null;
  parents: Array<{ parent: { id: string; fatherName: string | null; motherName: string | null; primaryPhone: string } }>;
}

interface AttendanceRecord {
  id: string;
  status: string;
  session: { date: string; class: { name: string } };
}

interface MarksRecord {
  id: string;
  value: string;
  status: string;
  exam: { name: string; maxMarks: number; startDate: string };
}

interface FeeInstallment {
  id: string;
  amount: number;
  status: string;
  dueDate: string;
  category: { name: string };
}

function useStudent(id: string) {
  return useQuery<{ data: { student: Student } }>({
    queryKey: ['student', id],
    queryFn: () => fetch(`/api/v1/students/${id}`).then((r) => r.json()),
    staleTime: 60_000,
  });
}

function useStudentAttendance(id: string) {
  return useQuery<{ data: { records: AttendanceRecord[]; summary: { total: number; byStatus: Record<string, number>; attendancePct: number | null } } }>({
    queryKey: ['student', id, 'attendance'],
    queryFn: () => fetch(`/api/v1/students/${id}/attendance`).then((r) => r.json()),
    staleTime: 60_000,
  });
}

function useStudentMarks(id: string) {
  return useQuery<{ data: { marks: MarksRecord[] } }>({
    queryKey: ['student', id, 'marks'],
    queryFn: () => fetch(`/api/v1/students/${id}/marks`).then((r) => r.json()),
    staleTime: 60_000,
  });
}

function useStudentFees(id: string) {
  return useQuery<{ data: { installments: FeeInstallment[]; feeAccount: { totalAmount: number; totalPaid: number; totalDue: number } | null } }>({
    queryKey: ['student', id, 'fees'],
    queryFn: () => fetch(`/api/v1/students/${id}/fees`).then((r) => r.json()),
    staleTime: 60_000,
  });
}

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PRESENT: 'default', ABSENT: 'destructive', LATE: 'secondary', MEDICAL_LEAVE: 'outline',
};

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const student = useStudent(id);
  const [tab, setTab] = useState('profile');
  const attendance = useStudentAttendance(id);
  const marks = useStudentMarks(id);
  const fees = useStudentFees(id);

  const s = student.data?.data?.student;

  return (
    <div className="space-y-6">
      {student.isError && <ErrorBanner message="Failed to load student profile." />}

      {student.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      ) : s ? (
        <PageHeader
          title={s.name}
          description={`Roll No: ${s.rollNo}${s.admissionNo ? ` · Admission: ${s.admissionNo}` : ''}`}
        >
          <Badge variant={s.isActive ? 'default' : 'secondary'}>
            {s.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </PageHeader>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="profile" className="gap-2"><User className="h-3.5 w-3.5" />Profile</TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2"><CalendarCheck className="h-3.5 w-3.5" />Attendance</TabsTrigger>
          <TabsTrigger value="marks" className="gap-2"><BookOpen className="h-3.5 w-3.5" />Marks</TabsTrigger>
          <TabsTrigger value="fees" className="gap-2"><CreditCard className="h-3.5 w-3.5" />Fees</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-4">
          {s && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-sm">Personal details</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Email</span><span>{s.email}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Gender</span><span>{s.gender ?? '—'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Grade ID</span><span className="font-mono text-xs">{s.currentGradeId ?? '—'}</span></div>
                </CardContent>
              </Card>
              {s.parents.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Parents / Guardians</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {s.parents.map(({ parent }) => (
                      <div key={parent.id} className="text-sm space-y-1">
                        {parent.fatherName && <div><span className="text-slate-500">Father: </span>{parent.fatherName}</div>}
                        {parent.motherName && <div><span className="text-slate-500">Mother: </span>{parent.motherName}</div>}
                        <div><span className="text-slate-500">Phone: </span>{parent.primaryPhone}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="attendance" className="mt-4 space-y-4">
          {attendance.isPending ? (
            <Card><CardContent className="pt-6"><Skeleton className="h-4 w-64" /></CardContent></Card>
          ) : attendance.data?.data ? (
            <>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                {Object.entries(attendance.data.data.summary.byStatus).map(([status, count]) => (
                  <Card key={status}>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{status.replace('_', ' ')}</div>
                    </CardContent>
                  </Card>
                ))}
                {attendance.data.data.summary.attendancePct !== null && (
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold">{attendance.data.data.summary.attendancePct.toFixed(1)}%</div>
                      <div className="text-xs text-slate-500 mt-0.5">Attendance</div>
                    </CardContent>
                  </Card>
                )}
              </div>
              <div className="grid gap-2">
                {attendance.data.data.records.slice(0, 30).map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <span>{new Date(r.session.date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    <span className="text-slate-500 text-xs">{r.session.class.name}</span>
                    <Badge variant={STATUS_COLORS[r.status] ?? 'secondary'} className="text-xs">{r.status}</Badge>
                  </div>
                ))}
                {attendance.data.data.records.length === 0 && <EmptyState message="No attendance records." />}
              </div>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="marks" className="mt-4 space-y-3">
          {marks.isPending ? (
            <Card><CardContent className="pt-6"><Skeleton className="h-4 w-64" /></CardContent></Card>
          ) : marks.data?.data?.marks.length === 0 ? (
            <EmptyState message="No marks recorded." />
          ) : (
            marks.data?.data?.marks.map((m) => (
              <Card key={m.id}>
                <CardHeader className="pb-1 pt-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-sm">{m.exam.name}</CardTitle>
                      <CardDescription className="text-xs">{new Date(m.exam.startDate).toLocaleDateString('en-IN')}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{m.value} / {m.exam.maxMarks}</div>
                      <Badge variant={m.status === 'LOCKED' ? 'default' : 'secondary'} className="text-xs">{m.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="fees" className="mt-4 space-y-4">
          {fees.isPending ? (
            <Card><CardContent className="pt-6"><Skeleton className="h-4 w-64" /></CardContent></Card>
          ) : (
            <>
              {fees.data?.data?.feeAccount && (
                <div className="grid gap-3 grid-cols-3">
                  {[
                    { label: 'Total', value: fees.data.data.feeAccount.totalAmount },
                    { label: 'Paid', value: fees.data.data.feeAccount.totalPaid },
                    { label: 'Due', value: fees.data.data.feeAccount.totalDue },
                  ].map(({ label, value }) => (
                    <Card key={label}>
                      <CardContent className="pt-4 text-center">
                        <div className="text-xl font-bold">₹{Number(value).toLocaleString('en-IN')}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              <div className="grid gap-2">
                {(fees.data?.data?.installments ?? []).map((inst) => (
                  <div key={inst.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <span>{inst.category.name}</span>
                    <span className="text-slate-500 text-xs">{new Date(inst.dueDate).toLocaleDateString('en-IN')}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">₹{Number(inst.amount).toLocaleString('en-IN')}</span>
                      <Badge variant={inst.status === 'PAID' ? 'default' : inst.status === 'OVERDUE' ? 'destructive' : 'secondary'} className="text-xs">{inst.status}</Badge>
                    </div>
                  </div>
                ))}
                {(fees.data?.data?.installments ?? []).length === 0 && <EmptyState message="No fee installments." />}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
