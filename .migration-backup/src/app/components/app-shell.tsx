'use client';

import { useState, type ReactNode } from 'react';
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  History,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/components/ui/utils';

const ICONS = {
  dashboard: LayoutDashboard,
  classes: BookOpen,
  students: Users,
  requests: ClipboardList,
  logs: History,
  faculty: LayoutGrid,
} as const;

export type AppShellNavItem = {
  label: string;
  href: string;
  icon: keyof typeof ICONS;
  exact?: boolean;
};

type AppShellProps = {
  brand: string;
  title: string;
  description: string;
  navItems: AppShellNavItem[];
  primaryAction?: {
    label: string;
    href: string;
  };
  children: ReactNode;
};

export function AppShell({ brand, title, description, navItems, primaryAction, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      router.replace('/auth/login');
      router.refresh();
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.2),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.15),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#eef4ff_48%,_#f4f7fb_100%)] text-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.5),rgba(255,255,255,0.8))]" />
      <div className="pointer-events-none absolute -left-24 top-32 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-16 h-96 w-96 rounded-full bg-indigo-300/20 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-[1600px] gap-4 p-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:p-6">
        <aside className="hidden overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950/95 text-white shadow-2xl shadow-slate-900/10 lg:flex lg:flex-col">
          <div className="border-b border-white/10 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-lg shadow-sky-500/30">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-sky-200/80">{brand}</p>
                <p className="text-sm text-slate-300">{title}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{description}</p>
          </div>

          <div className="flex-1 p-4">
            <div className="mb-4 flex items-center justify-between px-2 text-xs uppercase tracking-[0.28em] text-slate-400">
              <span>Navigation</span>
              <Badge variant="secondary" className="border-0 bg-white/10 text-white">
                Live
              </Badge>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = ICONS[item.icon];

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all',
                      active
                        ? 'bg-white/12 text-white shadow-inner shadow-white/10 ring-1 ring-white/10'
                        : 'text-slate-300 hover:bg-white/8 hover:text-white'
                    )}
                  >
                    <Icon className={cn('h-4 w-4', active ? 'text-sky-300' : 'text-slate-400')} />
                    <span className="flex-1">{item.label}</span>
                    {active && <ArrowRight className="h-4 w-4 text-sky-300" />}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="space-y-4 border-t border-white/10 p-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Session</p>
              <p className="mt-2 text-sm font-medium text-white">Server-verified session</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">All protected routes derive identity from Supabase auth and the school database.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <header className="sticky top-4 z-20 rounded-[2rem] border border-white/75 bg-white/85 px-4 py-4 shadow-xl shadow-slate-900/5 backdrop-blur-xl md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-500">
                  <span>{brand}</span>
                  <Badge variant="secondary" className="border-0 bg-sky-100 text-sky-700">
                    Connected
                  </Badge>
                </div>
                <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-950 sm:text-2xl">{title}</h1>
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
                <Button type="button" variant="outline" onClick={handleLogout} disabled={isLoggingOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </Button>
              </div>
            </div>
          </header>

          <main className="rounded-[2rem] border border-white/75 bg-white/90 p-4 shadow-xl shadow-slate-900/5 backdrop-blur-xl sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/80 to-transparent" />
    </div>
  );
}
