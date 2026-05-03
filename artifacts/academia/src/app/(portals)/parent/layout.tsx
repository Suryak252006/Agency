import { AppShell, type AppShellNavItem } from '@/components/app-shell';
import { requirePageSessionUser } from '@/lib/server/session';

const NAV_ITEMS: AppShellNavItem[] = [
  { label: 'Dashboard',    href: '/parent',               icon: 'dashboard',    exact: true },
  { label: 'Attendance',   href: '/parent/attendance',    icon: 'attendance' },
  { label: 'Marks',        href: '/parent/marks',         icon: 'classes' },
  { label: 'Fees',         href: '/parent/fees',          icon: 'fees' },
  { label: 'Report Cards', href: '/parent/report-cards',  icon: 'report-cards' },
  { label: 'Notices',      href: '/parent/notices',       icon: 'notices' },
  { label: 'Profile',      href: '/parent/profile',       icon: 'students' },
];

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  await requirePageSessionUser('parent');

  return (
    <AppShell
      brand="Academia Parent"
      title="Parent portal"
      description="Stay connected with your child's progress, attendance, fees, and school announcements."
      navItems={NAV_ITEMS}
    >
      {children}
    </AppShell>
  );
}
