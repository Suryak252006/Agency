import { AppShell, type AppShellNavItem } from '@/components/app-shell';
import { requirePageSessionUser } from '@/lib/server/session';
import { getUserWithPermissions } from '@/lib/server/permissions';
import { shouldShowMenuItem } from '@/lib/rbac/utils';

type NavItemConfig = AppShellNavItem & { requiredPermission: string | null };

/**
 * Full admin nav catalogue with per-item permission requirements.
 * Visibility is resolved at request time via shouldShowMenuItem so
 * different admin profiles (full admin vs. limited operator) see
 * only the items their current RBAC permissions allow.
 *
 * requiredPermission: null  → always visible once inside the admin portal
 * requiredPermission: <key> → shown only when the user holds that permission
 *                             (directly through a role or a custom feature)
 */
const ALL_NAV_ITEMS: NavItemConfig[] = [
  { label: 'Dashboard',         href: '/admin',                   icon: 'dashboard',      exact: true, requiredPermission: null },
  { label: 'Classes',           href: '/admin/classes',           icon: 'classes',                     requiredPermission: 'marks.approve' },
  { label: 'Students',          href: '/admin/students',          icon: 'students',                    requiredPermission: 'students.view' },
  { label: 'Parents',           href: '/admin/parents',           icon: 'parents',                     requiredPermission: 'students.view' },
  { label: 'Faculty',           href: '/admin/faculty',           icon: 'students',                    requiredPermission: 'faculty.view' },
  { label: 'Departments',       href: '/admin/departments',       icon: 'classes',                     requiredPermission: 'settings.view' },
  { label: 'Attendance',        href: '/admin/attendance',        icon: 'attendance',                  requiredPermission: 'marks.approve' },
  { label: 'Exams',             href: '/admin/exams',             icon: 'classes',                     requiredPermission: 'marks.approve' },
  { label: 'Fees',              href: '/admin/fees',              icon: 'fees',                        requiredPermission: 'settings.view' },
  { label: 'Notices',           href: '/admin/notices',           icon: 'notices',                     requiredPermission: null },
  { label: 'Report Cards',      href: '/admin/report-cards',      icon: 'report-cards',                requiredPermission: 'marks.approve' },
  { label: 'Academic Years',    href: '/admin/academic-years',    icon: 'academic-years',              requiredPermission: 'settings.view' },
  { label: 'Grades & Subjects', href: '/admin/grades',            icon: 'grades',                      requiredPermission: 'settings.view' },
  { label: 'Requests',          href: '/admin/requests',          icon: 'requests',                    requiredPermission: 'marks.approve' },
  { label: 'Logs',              href: '/admin/logs',              icon: 'logs',                        requiredPermission: 'logs.view' },
  { label: 'School Setup',      href: '/admin/setup',             icon: 'setup',                       requiredPermission: 'settings.edit' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await requirePageSessionUser('admin');

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

  const showRequestsAction = navItems.some((item) => item.href === '/admin/requests');

  return (
    <AppShell
      brand="Academia Admin"
      title="Administrative console"
      description="Manage classes, approvals, audit logs, and school-wide operational workflows from one place."
      navItems={navItems}
      primaryAction={showRequestsAction ? { label: 'Review requests', href: '/admin/requests' } : undefined}
    >
      {children}
    </AppShell>
  );
}
