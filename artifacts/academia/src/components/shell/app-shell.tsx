'use client';

import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';
import type { AppShellProps, AppShellNavItem } from './types';

export type { AppShellNavItem };

export function AppShell({
  brand,
  title,
  description,
  navItems,
  primaryAction,
  children,
}: AppShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.2),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.15),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#eef4ff_48%,_#f4f7fb_100%)] text-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.5),rgba(255,255,255,0.8))]" />
      <div className="pointer-events-none absolute -left-24 top-32 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-16 h-96 w-96 rounded-full bg-indigo-300/20 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-[1600px] gap-4 p-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:p-6">
        <Sidebar
          brand={brand}
          title={title}
          description={description}
          navItems={navItems}
        />

        <div className="flex min-w-0 flex-col gap-4">
          <TopBar
            brand={brand}
            title={title}
            description={description}
            primaryAction={primaryAction}
          />

          <main className="rounded-[2rem] border border-white/75 bg-white/90 p-4 shadow-xl shadow-slate-900/5 backdrop-blur-xl sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/80 to-transparent" />
    </div>
  );
}
