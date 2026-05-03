'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type TopBarProps = {
  brand: string;
  title: string;
  description: string;
  primaryAction?: { label: string; href: string };
};

export function TopBar({ brand, title, description, primaryAction }: TopBarProps) {
  const router = useRouter();

  return (
    <header className="sticky top-4 z-20 rounded-[2rem] border border-white/75 bg-white/85 px-4 py-4 shadow-xl shadow-slate-900/5 backdrop-blur-xl md:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-500">
            <span>{brand}</span>
            <Badge variant="secondary" className="border-0 bg-sky-100 text-sky-700">
              Connected
            </Badge>
          </div>
          <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-950 sm:text-2xl">
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right shadow-sm">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Status</p>
            <p className="text-sm font-medium text-slate-900">Session backed</p>
          </div>
          {primaryAction && (
            <Button type="button" onClick={() => router.push(primaryAction.href)}>
              {primaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
