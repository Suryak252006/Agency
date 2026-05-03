import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { ICONS, type AppShellNavItem } from './types';

type NavLinkProps = {
  item: AppShellNavItem;
  pathname: string;
};

export function NavLink({ item, pathname }: NavLinkProps) {
  const active = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = ICONS[item.icon];

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all',
        active
          ? 'bg-white/12 text-white shadow-inner shadow-white/10 ring-1 ring-white/10'
          : 'text-slate-300 hover:bg-white/8 hover:text-white',
      )}
    >
      <Icon className={cn('h-4 w-4', active ? 'text-sky-300' : 'text-slate-400')} />
      <span className="flex-1">{item.label}</span>
      {active && <ArrowRight className="h-4 w-4 text-sky-300" />}
    </Link>
  );
}
