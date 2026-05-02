import { AppShell, type AppShellNavItem } from '@/app/components/app-shell';
import { requirePageSessionUser } from '@/lib/server/session';

const NAV_ITEMS: AppShellNavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: 'dashboard', exact: true },
  { label: 'Classes', href: '/admin/classes', icon: 'classes' },
  { label: 'Students', href: '/admin/students', icon: 'students' },
  { label: 'Requests', href: '/admin/requests', icon: 'requests' },
  { label: 'Logs', href: '/admin/logs', icon: 'logs' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePageSessionUser('admin');

  return (
    <AppShell
      brand="Academia Admin"
      title="Administrative console"
      description="Manage classes, approvals, audit logs, and school-wide operational workflows from one place."
      navItems={NAV_ITEMS}
      primaryAction={{ label: 'Review requests', href: '/admin/requests' }}
    >
      {children}
    </AppShell>
  );
}
