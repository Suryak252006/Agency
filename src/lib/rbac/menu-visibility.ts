/**
 * Menu Visibility Engine - Calculate visible menu items based on permissions
 * 
 * Enables role-based menu rendering for:
 * - Sidebar navigation
 * - Breadcrumbs
 * - Action buttons
 * - Feature flags
 */

import {
  userHasAnyPermission,
  userHasAllPermissions,
  userHasSystemRole,
  getUserDepartmentIds,
} from './utils';
import { IUserWithPermissions } from '@/types/rbac';

// ============================================================
// TYPES
// ============================================================

export interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  requiredPermission?: string | string[];
  requiredRole?: string;
  requiredSystemRole?: string;
  requiresDepartment?: boolean;
  children?: MenuItem[];
  badge?: {
    text: string;
    color: 'red' | 'green' | 'blue' | 'yellow';
  };
  divider?: boolean;
}

export interface ActionButton {
  id: string;
  label: string;
  icon?: string;
  onClick?: () => void;
  requiredPermission?: string | string[];
  requiredRole?: string;
  requiresDepartment?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  title?: string; // Tooltip for why it's disabled
}

export interface MenuVisibility {
  isVisible: boolean;
  isEnabled: boolean;
  reason?: string; // Why it's hidden or disabled
}

// ============================================================
// MENU DEFINITIONS
// ============================================================

/**
 * Complete menu structure for the application
 */
export const ADMIN_MENU: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/admin',
    icon: 'LayoutDashboard',
    requiredRole: 'admin',
  },
  {
    id: 'departments',
    label: 'Departments',
    href: '/admin/departments',
    icon: 'Building2',
    requiredPermission: 'departments.view',
  },
  {
    id: 'faculty',
    label: 'Faculty Management',
    href: '/admin/faculty',
    icon: 'Users',
    requiredPermission: 'faculty.view',
  },
  {
    id: 'students',
    label: 'Students',
    href: '/admin/students',
    icon: 'GraduationCap',
    requiredPermission: 'students.view',
  },
  {
    id: 'classes',
    label: 'Classes',
    href: '/admin/classes',
    icon: 'BookOpen',
    requiredPermission: 'classes.view',
  },
  {
    id: 'exams',
    label: 'Exams',
    href: '/admin/exams',
    icon: 'ClipboardCheck',
    requiredPermission: 'exams.view',
  },
  {
    id: 'marks',
    label: 'Marks Management',
    href: '/admin/marks',
    icon: 'Percent',
    requiredPermission: 'marks.view',
  },
  {
    id: 'rbac',
    label: 'RBAC & Permissions',
    href: '/admin/roles',
    icon: 'Shield',
    requiredPermission: 'roles.view',
    children: [
      {
        id: 'roles',
        label: 'Roles',
        href: '/admin/roles',
        requiredPermission: 'roles.view',
      },
      {
        id: 'custom-features',
        label: 'Custom Features',
        href: '/admin/custom-features',
        requiredPermission: 'custom_features.view',
      },
      {
        id: 'permissions',
        label: 'Permissions',
        href: '/admin/permissions',
        requiredPermission: 'permissions.view',
      },
    ],
  },
  {
    id: 'logs',
    label: 'Audit Logs',
    href: '/admin/logs',
    icon: 'FileText',
    requiredPermission: 'logs.view',
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/admin/settings',
    icon: 'Settings',
    requiredPermission: 'settings.edit',
  },
];

/**
 * HOD (Department Head) menu
 */
export const HOD_MENU: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Department Dashboard',
    href: '/faculty',
    icon: 'LayoutDashboard',
    requiredRole: 'hod',
  },
  {
    id: 'faculty',
    label: 'Faculty',
    href: '/faculty/faculty',
    icon: 'Users',
    requiredPermission: 'faculty.view',
    requiresDepartment: true,
  },
  {
    id: 'students',
    label: 'Students',
    href: '/faculty/students',
    icon: 'GraduationCap',
    requiredPermission: 'students.view',
    requiresDepartment: true,
  },
  {
    id: 'classes',
    label: 'Classes',
    href: '/faculty/classes',
    icon: 'BookOpen',
    requiredPermission: 'classes.view',
    requiresDepartment: true,
  },
  {
    id: 'exams',
    label: 'Exams',
    href: '/faculty/exams',
    icon: 'ClipboardCheck',
    requiredPermission: 'exams.view',
    requiresDepartment: true,
  },
  {
    id: 'marks',
    label: 'Marks Approval',
    href: '/faculty/marks',
    icon: 'Percent',
    requiredPermission: 'marks.approve',
    requiresDepartment: true,
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/faculty/reports',
    icon: 'BarChart3',
    requiredPermission: 'reports.view',
    requiresDepartment: true,
  },
];

/**
 * Faculty menu
 */
export const FACULTY_MENU: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/faculty',
    icon: 'LayoutDashboard',
  },
  {
    id: 'students',
    label: 'My Students',
    href: '/faculty/students',
    icon: 'GraduationCap',
    requiredPermission: 'students.view',
  },
  {
    id: 'exams',
    label: 'My Exams',
    href: '/faculty/exams',
    icon: 'ClipboardCheck',
    requiredPermission: 'exams.view',
  },
  {
    id: 'marks',
    label: 'Enter Marks',
    href: '/faculty/marks',
    icon: 'Percent',
    requiredPermission: 'marks.submit',
  },
  {
    id: 'requests',
    label: 'Mark Requests',
    href: '/faculty/requests',
    icon: 'FileText',
    requiredPermission: 'requests.view',
    badge: {
      text: 'New',
      color: 'red',
    },
  },
];

// ============================================================
// VISIBILITY CALCULATIONS
// ============================================================

/**
 * Check if menu item is visible for user
 */
export function isMenuItemVisible(
  item: MenuItem,
  user: IUserWithPermissions,
  departmentId?: string
): MenuVisibility {
  // Check permission requirement
  if (item.requiredPermission) {
    const permissions = Array.isArray(item.requiredPermission)
      ? item.requiredPermission
      : [item.requiredPermission];

    const hasPermission = userHasAnyPermission(user, permissions);

    if (!hasPermission) {
      return {
        isVisible: false,
        isEnabled: false,
        reason: `Missing permission: ${item.requiredPermission}`,
      };
    }
  }

  // Check role requirement
  if (item.requiredRole) {
    const hasRole = user.roles?.some(
      (r) => r.id.toLowerCase() === item.requiredRole?.toLowerCase()
    );

    if (!hasRole) {
      return {
        isVisible: false,
        isEnabled: false,
        reason: `Requires role: ${item.requiredRole}`,
      };
    }
  }

  // Check system role requirement
  if (item.requiredSystemRole) {
    const hasRole = userHasSystemRole(user, item.requiredSystemRole);

    if (!hasRole) {
      return {
        isVisible: false,
        isEnabled: false,
        reason: `Requires system role: ${item.requiredSystemRole}`,
      };
    }
  }

  // Check department requirement
  if (item.requiresDepartment) {
    const userDepts = getUserDepartmentIds(user);
    const enabled = departmentId || userDepts.length > 0;

    if (!enabled) {
      return {
        isVisible: true,
        isEnabled: false,
        reason: 'No departments assigned',
      };
    }
  }

  return {
    isVisible: true,
    isEnabled: true,
  };
}

/**
 * Filter menu items based on user permissions
 */
export function filterMenuItems(
  items: MenuItem[],
  user: IUserWithPermissions,
  departmentId?: string
): MenuItem[] {
  return items
    .map((item) => {
      const visibility = isMenuItemVisible(item, user, departmentId);

      if (!visibility.isVisible) {
        return null;
      }

      // Filter children if present
      if (item.children) {
        const visibleChildren = filterMenuItems(
          item.children,
          user,
          departmentId
        );

        if (visibleChildren.length === 0) {
          return null; // Hide parent if no visible children
        }

        return {
          ...item,
          children: visibleChildren,
        };
      }

      return item;
    })
    .filter(Boolean) as MenuItem[];
}

/**
 * Get menu for user based on system role
 */
export function getMenuForUser(
  user: IUserWithPermissions,
  departmentId?: string
): MenuItem[] {
  if (userHasSystemRole(user, 'SUPER_ADMIN')) {
    return filterMenuItems(ADMIN_MENU, user, departmentId);
  }

  if (userHasSystemRole(user, 'ADMIN')) {
    return filterMenuItems(ADMIN_MENU, user, departmentId);
  }

  if (userHasSystemRole(user, 'HOD')) {
    return filterMenuItems(HOD_MENU, user, departmentId);
  }

  if (userHasSystemRole(user, 'FACULTY')) {
    return filterMenuItems(FACULTY_MENU, user, departmentId);
  }

  return [];
}

// ============================================================
// ACTION BUTTON VISIBILITY
// ============================================================

/**
 * Check if action button should be visible
 */
export function isActionVisible(
  action: ActionButton,
  user: IUserWithPermissions,
  departmentId?: string
): MenuVisibility {
  // Check permission
  if (action.requiredPermission) {
    const permissions = Array.isArray(action.requiredPermission)
      ? action.requiredPermission
      : [action.requiredPermission];

    const hasPermission = userHasAllPermissions(user, permissions);

    if (!hasPermission) {
      return {
        isVisible: false,
        isEnabled: false,
        reason: `Missing permission: ${action.requiredPermission}`,
      };
    }
  }

  // Check role
  if (action.requiredRole) {
    const hasRole = user.roles?.some(
      (r) => r.id.toLowerCase() === action.requiredRole?.toLowerCase()
    );

    if (!hasRole) {
      return {
        isVisible: false,
        isEnabled: false,
        reason: `Requires role: ${action.requiredRole}`,
      };
    }
  }

  // Check department
  if (action.requiresDepartment && !departmentId) {
    return {
      isVisible: true,
      isEnabled: false,
      reason: 'Department selection required',
    };
  }

  return {
    isVisible: true,
    isEnabled: true,
  };
}

/**
 * Filter action buttons for user
 */
export function filterActions(
  actions: ActionButton[],
  user: IUserWithPermissions,
  departmentId?: string
): ActionButton[] {
  return actions
    .map((action) => {
      const visibility = isActionVisible(action, user, departmentId);

      if (!visibility.isVisible) {
        return null;
      }

      return {
        ...action,
        disabled: action.disabled || !visibility.isEnabled,
        title: action.title || visibility.reason,
      };
    })
    .filter(Boolean) as ActionButton[];
}

// ============================================================
// COMMON BUTTON GROUPS
// ============================================================

/**
 * Mark Management Actions
 */
export const MARK_ACTIONS: ActionButton[] = [
  {
    id: 'submit-marks',
    label: 'Submit Marks',
    icon: 'Upload',
    requiredPermission: 'marks.submit',
    variant: 'primary',
  },
  {
    id: 'approve-marks',
    label: 'Approve Marks',
    icon: 'Check',
    requiredPermission: 'marks.approve',
    variant: 'primary',
  },
  {
    id: 'request-correction',
    label: 'Request Correction',
    icon: 'Edit',
    requiredPermission: 'marks.submit',
    variant: 'secondary',
  },
  {
    id: 'download-report',
    label: 'Download Report',
    icon: 'Download',
    requiredPermission: 'reports.view',
    variant: 'secondary',
  },
];

/**
 * Faculty Management Actions
 */
export const FACULTY_ACTIONS: ActionButton[] = [
  {
    id: 'add-faculty',
    label: 'Add Faculty',
    icon: 'Plus',
    requiredPermission: 'faculty.create',
    variant: 'primary',
  },
  {
    id: 'edit-faculty',
    label: 'Edit',
    icon: 'Edit2',
    requiredPermission: 'faculty.edit',
    variant: 'secondary',
  },
  {
    id: 'assign-dept',
    label: 'Assign Department',
    icon: 'Link',
    requiredPermission: 'faculty.assign',
    variant: 'secondary',
  },
  {
    id: 'delete-faculty',
    label: 'Delete',
    icon: 'Trash2',
    requiredPermission: 'faculty.delete',
    variant: 'danger',
  },
];

/**
 * Exam Management Actions
 */
export const EXAM_ACTIONS: ActionButton[] = [
  {
    id: 'create-exam',
    label: 'Create Exam',
    icon: 'Plus',
    requiredPermission: 'exams.create',
    requiresDepartment: true,
    variant: 'primary',
  },
  {
    id: 'edit-exam',
    label: 'Edit',
    icon: 'Edit2',
    requiredPermission: 'exams.edit',
    variant: 'secondary',
  },
  {
    id: 'publish-results',
    label: 'Publish Results',
    icon: 'FileText',
    requiredPermission: 'results.publish',
    variant: 'primary',
  },
  {
    id: 'delete-exam',
    label: 'Delete',
    icon: 'Trash2',
    requiredPermission: 'exams.delete',
    variant: 'danger',
  },
];

// ============================================================
// PERMISSION CHECKING HELPERS
// ============================================================

/**
 * Can user edit this resource?
 */
export function canEdit(
  user: IUserWithPermissions,
  resourceType: string,
  departmentId?: string
): boolean {
  const permission = `${resourceType}.edit`;
  return userHasAnyPermission(user, [permission]);
}

/**
 * Can user delete this resource?
 */
export function canDelete(
  user: IUserWithPermissions,
  resourceType: string
): boolean {
  const permission = `${resourceType}.delete`;
  return userHasAnyPermission(user, [permission]);
}

/**
 * Can user create new resource?
 */
export function canCreate(
  user: IUserWithPermissions,
  resourceType: string,
  departmentId?: string
): boolean {
  const permission = `${resourceType}.create`;
  return userHasAnyPermission(user, [permission]);
}

/**
 * Can user view this resource?
 */
export function canView(
  user: IUserWithPermissions,
  resourceType: string
): boolean {
  const permission = `${resourceType}.view`;
  return userHasAnyPermission(user, [permission]);
}

/**
 * Check if user is senior to perform operation
 * (SUPER_ADMIN > ADMIN > HOD > FACULTY)
 */
export function isSeniorRole(user: IUserWithPermissions): boolean {
  return (
    userHasSystemRole(user, 'SUPER_ADMIN') ||
    userHasSystemRole(user, 'ADMIN')
  );
}

/**
 * Check if user is department head
 */
export function isDepartmentHead(user: IUserWithPermissions): boolean {
  return userHasSystemRole(user, 'HOD');
}

/**
 * Check if user is faculty member
 */
export function isFaculty(user: IUserWithPermissions): boolean {
  return userHasSystemRole(user, 'FACULTY');
}

export default {
  isMenuItemVisible,
  filterMenuItems,
  getMenuForUser,
  isActionVisible,
  filterActions,
  canEdit,
  canDelete,
  canCreate,
  canView,
  isSeniorRole,
  isDepartmentHead,
  isFaculty,
  ADMIN_MENU,
  HOD_MENU,
  FACULTY_MENU,
  MARK_ACTIONS,
  FACULTY_ACTIONS,
  EXAM_ACTIONS,
};
