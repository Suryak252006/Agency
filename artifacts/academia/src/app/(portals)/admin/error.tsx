'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AdminPortal][ErrorBoundary]', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex items-center justify-center p-6">
      <Card className="w-full max-w-lg border-slate-200 shadow-lg">
        <CardHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Something went wrong</CardTitle>
          <CardDescription>
            This page hit an unexpected error. Try again or return to the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error.digest && (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-500">
              Error ID: {error.digest}
            </p>
          )}
          <div className="mt-5 flex gap-3">
            <Button onClick={reset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
            <Button variant="outline" onClick={() => window.location.replace('/admin')}>
              Back to dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
