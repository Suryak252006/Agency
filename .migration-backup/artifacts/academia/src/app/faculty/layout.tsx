import { AppShell, type AppShellNavItem } from '@/app/components/app-shell';
import { requirePageSessionUser } from '@/lib/server/session';

const NAV_ITEMS: AppShellNavItem[] = [
  { label: 'Classes', href: '/faculty', icon: 'faculty', exact: true },
  { label: 'Requests', href: '/faculty/requests', icon: 'requests' },
  { label: 'Marks', href: '/faculty/classes', icon: 'classes' },
];

export default async function FacultyLayout({ children }: { children: React.ReactNode }) {
  await requirePageSessionUser('faculty');

  return (
    <AppShell
      brand="Academia Faculty"
      title="Faculty workspace"
      description="Track classes, manage marks, and review requests with a focused workflow shell."
      navItems={NAV_ITEMS}
      primaryAction={{ label: 'Open requests', href: '/faculty/requests' }}
    >
      {children}
    </AppShell>
  );
}
