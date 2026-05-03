'use client';

import { Receipt, CreditCard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';

interface Collection {
  id: string;
  amount: number;
  paymentMode: string;
  receiptNo: string;
  receiptDate: string;
  studentId: string;
}

function useFeeHistory() {
  return useQuery<{ data: { collections: Collection[]; total: number } }>({
    queryKey: ['parent', 'fees'],
    queryFn: () => fetch('/api/v1/fees/collection?limit=20').then((r) => r.json()),
    staleTime: 60_000,
  });
}

const MODE_LABELS: Record<string, string> = { CASH: 'Cash', CHEQUE: 'Cheque', NEFT: 'NEFT', UPI: 'UPI', DEMAND_DRAFT: 'DD' };

export default function ParentFeesPage() {
  const history = useFeeHistory();
  const items: Collection[] = history.data?.data?.collections ?? [];
  const total = items.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Fees" description="Fee payment history and receipts." />

      {history.isError && <ErrorBanner message="Failed to load fee records." />}

      {!history.isPending && items.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total paid (shown)</CardTitle>
            <CreditCard className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">₹{total.toLocaleString('en-IN')}</div>
            <p className="mt-1 text-xs text-slate-500">Across {items.length} payment{items.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {history.isPending ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-64 mt-1" /></CardHeader></Card>
          ))
        ) : items.length === 0 && !history.isError ? (
          <EmptyState message="No fee payment records found." />
        ) : (
          items.map((col) => (
            <Card key={col.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-slate-400" />
                      {col.receiptNo}
                    </CardTitle>
                    <CardDescription>
                      {new Date(col.receiptDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{MODE_LABELS[col.paymentMode] ?? col.paymentMode}</Badge>
                    <span className="font-semibold text-slate-900">₹{col.amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
