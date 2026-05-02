/**
 * Menu integration example for RBAC system
 * Shows how to add Roles & Permissions menu to your admin sidebar
 *
 * Update your src/components/app-shell.tsx or navigation component with this pattern
 */

import { PermissionGuard } from '@/components/permission-guard';
import { IUserWithPermissions } from '@/types/rbac';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from '@/components/ui/sidebar';
import {
  Users,
  Settings,
  Shield,
  Key,
  Lock,
  LogOut,
  MoreHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { userHasAnyPermission } from '@/lib/rbac/utils';

/**
 * Admin menu items with required permissions
 * Each item should have a requiredPermission field
 */
export const ADMIN_MENU_ITEMS = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: Users,
    requiredPermission: null, // Always visible
  },
  {
    label: 'Users',
    href: '/admin/users',
    icon: Users,
    requiredPermission: 'users.view',
  },
  {
    label: 'Teachers',
    href: '/admin/teachers',
    icon: Users,
    requiredPermission: 'teachers.view',
  },
  {
    label: 'Students',
    href: '/admin/students',
    icon: Users,
    requiredPermission: 'students.view',
  },
  {
    label: 'Exams',
    href: '/admin/exams',
    icon: Lock,
    requiredPermission: 'exams.view',
  },
  {
    label: 'Roles & Permissions',
    href: '/admin/roles',
    icon: Shield,
    requiredPermission: 'roles.view',
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    requiredPermission: 'settings.view',
  },
];

/**
 * Example: Update your app-shell.tsx or navigation component
 *
 * Replace your existing menu rendering with:
 */
interface AdminSidebarProps {
  user?: IUserWithPermissions | null;
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarMenu>
          {ADMIN_MENU_ITEMS.map((item) => (
            <PermissionGuard
              key={item.href}
              user={user}
              permission={item.requiredPermission || undefined}
              silent={!item.requiredPermission} // Show all items without permission requirement
            >
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </PermissionGuard>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}

/**
 * Alternative: Dropdown menu approach for user actions
 */
interface UserMenuProps {
  user?: IUserWithPermissions | null;
  onLogout: () => void;
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-2 hover:bg-gray-100 rounded-lg">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Admin menu - only show if user has admin permission */}
        <PermissionGuard
          user={user}
          permission="roles.view"
          silent={true}
        >
          <>
            <DropdownMenuItem asChild>
              <Link href="/admin/roles">
                <Shield className="h-4 w-4 mr-2" />
                Manage Roles
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        </PermissionGuard>

        {/* Settings - always visible */}
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Link>
        </DropdownMenuItem>

        {/* Logout */}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * STEP-BY-STEP INTEGRATION INSTRUCTIONS
 *
 * 1. Update src/components/app-shell.tsx:
 *    - Import PermissionGuard from '@/components/permission-guard'
 *    - Wrap your menu items with <PermissionGuard>
 *    - Pass user prop to PermissionGuard
 *    - Add requiredPermission prop matching the menu item
 *
 * 2. Update your navigation:
 *    - Add Roles & Permissions menu item
 *    - Set requiredPermission="roles.view"
 *    - This hides from users without permission
 *
 * 3. Update page routes:
 *    - Wrap protected pages with <ProtectedPageWrapper>
 *    - Set requiredPermission="roles.view"
 *    - User is redirected if unauthorized
 *
 * Example page:
 *
 * export default function RolesPage({ user }) {
 *   return (
 *     <ProtectedPageWrapper
 *       title="Roles & Permissions"
 *       user={user}
 *       requiredPermission="roles.view"
 *     >
 *       <RolesListTable />
 *     </ProtectedPageWrapper>
 *   );
 * }
 *
 * 4. Update API routes:
 *    - Wrap handlers with withPermission() middleware
 *    - Check permission at start of request
 *    - Return 403 if denied
 *
 * Example API route:
 *
 * import { withPermission } from '@/lib/rbac/middleware';
 *
 * export const GET = withPermission('roles.view', async (request) => {
 *   // Get roles...
 *   return NextResponse.json(roles);
 * });
 *
 * 5. Test everything:
 *    - Login as different roles
 *    - Verify menu items show/hide correctly
 *    - Verify pages redirect if unauthorized
 *    - Verify API returns 403 when denied
 */

/**
 * Configuration for dynamically hiding menu items based on roles
 *
 * Use this to group menu items by permission
 */
export const MENU_GROUPS = {
  CORE: {
    label: 'Core',
    items: [
      {
        label: 'Dashboard',
        href: '/admin',
        icon: Users,
        requiredPermission: null,
      },
    ],
  },
  MANAGEMENT: {
    label: 'Management',
    items: [
      {
        label: 'Users',
        href: '/admin/users',
        icon: Users,
        requiredPermission: 'users.view',
      },
      {
        label: 'Teachers',
        href: '/admin/teachers',
        icon: Users,
        requiredPermission: 'teachers.view',
      },
      {
        label: 'Students',
        href: '/admin/students',
        icon: Users,
        requiredPermission: 'students.view',
      },
    ],
  },
  ACADEMICS: {
    label: 'Academics',
    items: [
      {
        label: 'Exams',
        href: '/admin/exams',
        icon: Lock,
        requiredPermission: 'exams.view',
      },
      {
        label: 'Marks',
        href: '/admin/marks',
        icon: Key,
        requiredPermission: 'marks.view',
      },
    ],
  },
  SYSTEM: {
    label: 'System',
    items: [
      {
        label: 'Roles & Permissions',
        href: '/admin/roles',
        icon: Shield,
        requiredPermission: 'roles.view',
      },
      {
        label: 'Settings',
        href: '/admin/settings',
        icon: Settings,
        requiredPermission: 'settings.view',
      },
    ],
  },
};

/**
 * Hook to get visible menu items for a user
 */
export function useVisibleMenuItems(user?: IUserWithPermissions | null) {
  return Object.entries(MENU_GROUPS)
    .map(([key, group]) => ({
      ...group,
      items: group.items.filter((item) => {
        // No permission requirement = always show
        if (!item.requiredPermission) return true;
        // Has permission = show
        if (user && userHasAnyPermission(user, [item.requiredPermission]))
          return true;
        // No permission = hide
        return false;
      }),
    }))
    .filter((group) => group.items.length > 0); // Hide empty groups
}
