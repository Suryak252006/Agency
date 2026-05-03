import { Sparkles } from 'lucide-react';
import { NavList } from './nav-list';
import { LogoutButton } from './logout-button';
import type { AppShellNavItem } from './types';

type SidebarProps = {
  brand: string;
  title: string;
  description: string;
  navItems: AppShellNavItem[];
};

export function Sidebar({ brand, title, description, navItems }: SidebarProps) {
  return (
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

      <NavList navItems={navItems} />

      <div className="space-y-4 border-t border-white/10 p-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Session</p>
          <p className="mt-2 text-sm font-medium text-white">Server-verified session</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Identity derived from HMAC-signed cookies validated on every request.
          </p>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
