'use client';

import { useState } from 'react';
import { Receipt, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';

interface Collection {
  id: string;
  amount: number;
  paymentMode: string;
  receiptNo: string;
  receiptDate: string;
  notes: string | null;
  studentId: string;
}

function useFeeCollections(studentId?: string) {
  const params = new URLSearchParams({ limit: '50' });
  if (studentId) params.set('studentId', studentId);
  return useQuery<{ data: { collections: Collection[]; total: number } }>({
    queryKey: ['fees', 'collections', studentId],
    queryFn: () => fetch(`/api/v1/fees/collection?${params}`).then((r) => r.json()),
    staleTime: 30_000,
  });
}

const MODE_LABELS: Record<string, string> = { CASH: 'Cash', CHEQUE: 'Cheque', NEFT: 'NEFT', UPI: 'UPI', DEMAND_DRAFT: 'DD' };

export default function AdminFeeCollectionPage() {
  const [search, setSearch] = useState('');
  const collections = useFeeCollections();
  const items: Collection[] = collections.data?.data?.collections ?? [];

  const filtered = search
    ? items.filter((c) => c.receiptNo.toLowerCase().includes(search.toLowerCase()) || c.studentId.includes(search))
    : items;

  return (
    <div className="space-y-6">
      <PageHeader title="Fee collection" description="View all recorded fee payments and receipts." />

      {collections.isError && <ErrorBanner message="Failed to load fee collections." />}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search by student name, roll no, or receipt…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {collections.isPending ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-64 mt-1" /></CardHeader></Card>
          ))
        ) : filtered.length === 0 && !collections.isError ? (
          <EmptyState message="No fee collections found." />
        ) : (
          filtered.map((col) => (
            <Card key={col.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-slate-400" />
                      {col.receiptNo}
                    </CardTitle>
                    <CardDescription>
                      {new Date(col.receiptDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{MODE_LABELS[col.paymentMode] ?? col.paymentMode}</Badge>
                    <span className="font-semibold text-slate-900">₹{col.amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </CardHeader>
              {col.notes && (
                <CardContent className="text-sm text-slate-500">{col.notes}</CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
