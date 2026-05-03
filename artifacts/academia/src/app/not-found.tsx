import Link from 'next/link';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.15),_transparent_32%),linear-gradient(180deg,_#f8fbff_0%,_#eef4ff_100%)] p-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.5),rgba(255,255,255,0.8))]" />
      <div className="relative w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 shadow-lg shadow-sky-500/30">
          <BookOpen className="h-8 w-8 text-white" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This page doesn&apos;t exist or you don&apos;t have access to it. Check the URL or return to your dashboard.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="gap-2">
            <Link href="/auth/login">
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin">Admin dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
