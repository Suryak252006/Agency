'use client';

import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { NavLink } from './nav-link';
import type { AppShellNavItem } from './types';

type NavListProps = {
  navItems: AppShellNavItem[];
};

export function NavList({ navItems }: NavListProps) {
  const pathname = usePathname();

  return (
    <div className="flex-1 p-4">
      <div className="mb-4 flex items-center justify-between px-2 text-xs uppercase tracking-[0.28em] text-slate-400">
        <span>Navigation</span>
        <Badge variant="secondary" className="border-0 bg-white/10 text-white">
          Live
        </Badge>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
    </div>
  );
}
