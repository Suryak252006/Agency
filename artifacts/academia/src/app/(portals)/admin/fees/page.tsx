'use client';

import Link from 'next/link';
import { CreditCard, List, Receipt } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { useQuery } from '@tanstack/react-query';

function useFeeSummary() {
  return useQuery<{ data: { structures: unknown[]; categories: unknown[]; collections: unknown[] } }>({
    queryKey: ['fees', 'summary'],
    queryFn: async () => {
      const [structures, categories, collections] = await Promise.all([
        fetch('/api/v1/fees/structure').then((r) => r.json()),
        fetch('/api/v1/fees/categories').then((r) => r.json()),
        fetch('/api/v1/fees/collection?limit=5').then((r) => r.json()),
      ]);
      return { data: { structures: structures.data?.structures ?? [], categories: categories.data?.categories ?? [], collections: collections.data?.collections ?? [] } };
    },
    staleTime: 60_000,
  });
}

export default function AdminFeesPage() {
  const summary = useFeeSummary();
  const structureCount = summary.data?.data?.structures?.length ?? 0;
  const categoryCount = summary.data?.data?.categories?.length ?? 0;
  const collectionCount = summary.data?.data?.collections?.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Fees" description="Manage fee categories, structure, and collections." />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fee categories</CardTitle>
            <List className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{summary.isPending ? '—' : categoryCount}</div>
            <p className="mt-1 text-xs text-slate-500">Defined categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fee structures</CardTitle>
            <CreditCard className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{summary.isPending ? '—' : structureCount}</div>
            <p className="mt-1 text-xs text-slate-500">Active fee schedules</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent collections</CardTitle>
            <Receipt className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{summary.isPending ? '—' : collectionCount}</div>
            <p className="mt-1 text-xs text-slate-500">Last 5 transactions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/fees/structure">
          <Card className="cursor-pointer hover:border-slate-300 transition-colors h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-slate-500" />
                Fee structure
              </CardTitle>
              <CardDescription>Define fee schedules by grade and academic year.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Set up tuition, transport, exam, and other fee types with amounts, frequencies, and due dates.
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/fees/collection">
          <Card className="cursor-pointer hover:border-slate-300 transition-colors h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-slate-500" />
                Fee collection
              </CardTitle>
              <CardDescription>Record payments and generate receipts.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Record cash, online, or cheque payments. Auto-generate receipt numbers and mark installments as paid.
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
