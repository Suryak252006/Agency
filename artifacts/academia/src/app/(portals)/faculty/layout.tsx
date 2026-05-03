import { AppShell, type AppShellNavItem } from '@/components/app-shell';
import { requirePageSessionUser } from '@/lib/server/session';
import { getUserWithPermissions } from '@/lib/server/permissions';
import { shouldShowMenuItem } from '@/lib/rbac/utils';

type NavItemConfig = AppShellNavItem & { requiredPermission: string | null };

/**
 * Full faculty nav catalogue with per-item permission requirements.
 * Visibility is resolved at request time so faculty members with
 * restricted custom roles only see the items their permissions allow.
 *
 * requiredPermission: null  → always visible once inside the faculty portal
 * requiredPermission: <key> → shown only when the user holds that permission
 */
const ALL_NAV_ITEMS: NavItemConfig[] = [
  { label: 'Dashboard',  href: '/faculty',             icon: 'dashboard',  exact: true, requiredPermission: null },
  { label: 'Classes',    href: '/faculty/classes',     icon: 'classes',               requiredPermission: null },
  { label: 'Attendance', href: '/faculty/attendance',  icon: 'attendance',            requiredPermission: null },
  { label: 'Marks',      href: '/faculty/marks',       icon: 'classes',               requiredPermission: 'marks.create' },
  { label: 'Notices',    href: '/faculty/notices',     icon: 'notices',               requiredPermission: null },
  { label: 'Requests',   href: '/faculty/requests',    icon: 'requests',              requiredPermission: null },
];

export default async function FacultyLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await requirePageSessionUser('faculty');

  /**
   * Fetch full RBAC profile from the database.
   * Falls back to showing all nav items when permissions data is unavailable
   * (e.g. freshly created user with no RBAC roles assigned yet) so the
   * broad portal gate — already enforced by requirePageSessionUser — remains
   * the effective access boundary.
   */
  const rbacUser = await getUserWithPermissions(sessionUser.id);

  const navItems: AppShellNavItem[] = rbacUser
    ? ALL_NAV_ITEMS
        .filter(({ requiredPermission }) => shouldShowMenuItem(rbacUser, requiredPermission))
        .map(({ requiredPermission: _rp, ...item }) => item)
    : ALL_NAV_ITEMS.map(({ requiredPermission: _rp, ...item }) => item);

  return (
    <AppShell
      brand="Academia Faculty"
      title="Faculty workspace"
      description="Track classes, manage marks, and review requests with a focused workflow shell."
      navItems={navItems}
      primaryAction={{ label: 'Open requests', href: '/faculty/requests' }}
    >
      {children}
    </AppShell>
  );
}
