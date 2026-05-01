// ============================================================
// RBAC Utility Functions
// ============================================================

import { IUserWithPermissions, ICustomFeatureAssignment, PermissionCheckResult } from '@/types/rbac';
import { ROLE_PERMISSION_MAP, PERMISSIONS } from './constants';

// ============================================================
// PERMISSION CHECKING
// ============================================================

/**
 * Check if user has permission with department context
 * For department-scoped roles, validates department_id match
 * Returns true if: (1) no department required, or (2) user has role in that department
 */
export function userHasPermissionWithDepartment(
  user: IUserWithPermissions | null,
  permission: string,
  departmentId?: string,
): boolean {
  if (!user) return false;

  // Check direct permission from roles (including department-scoped)
  if (user.permissions.includes(permission)) {
    // If permission requires department context and user has department-scoped roles
    if (departmentId) {
      // Check if user has this permission in this specific department
      const roleAssignments = user.roles as Array<{
        permissions?: string[];
        permission?: string;
        departmentId?: string;
      }>;

      return roleAssignments.some(
        (role) =>
          (role.permission === permission || role.permissions?.includes(permission)) &&
          (!role.departmentId || role.departmentId === departmentId),
      );
    }
    return true;
  }

  // Check custom feature access with department scope
  return user.customFeatures.some((feature) => {
    const featureMatches = feature.feature?.key === permission;
    const notExpired = !isFeatureExpired(feature);
    const isAccepted = feature.acceptedAt !== null;
    const departmentMatches = !departmentId || !feature.departmentId || feature.departmentId === departmentId;

    return featureMatches && notExpired && isAccepted && departmentMatches;
  });
}

/**
 * Check if user can access a resource in a specific department
 * HOD can only access faculty/resources in their own department
 * FACULTY can access only in their assigned departments
 */
export function canAccessDepartment(
  user: IUserWithPermissions | null,
  departmentId: string,
  userDepartments: Array<{ id: string; primary?: boolean }>,
): boolean {
  if (!user || !departmentId) return false;

  // SUPER_ADMIN and ADMIN can access any department
  if (
    userHasSystemRole(user, 'SUPER_ADMIN') ||
    userHasSystemRole(user, 'ADMIN')
  ) {
    return true;
  }

  // HOD can access only their own department (first/primary department)
  if (userHasSystemRole(user, 'HOD')) {
    return userDepartments.some((d) => d.id === departmentId && (d.primary === true || userDepartments.length === 1));
  }

  // FACULTY can access any of their assigned departments
  return userDepartments.some((d) => d.id === departmentId);
}

/**
 * Check if user can manage faculty in a department
 * HOD can only manage faculty in their own department (overlapping departments)
 */
export function canManageFacultyInDepartment(
  actor: IUserWithPermissions | null,
  targetFacultyDepartments: Array<{ id: string }>,
  actorDepartments: Array<{ id: string }>,
): boolean {
  if (!actor) return false;

  // SUPER_ADMIN and ADMIN can manage any faculty
  if (
    userHasSystemRole(actor, 'SUPER_ADMIN') ||
    userHasSystemRole(actor, 'ADMIN')
  ) {
    return true;
  }

  // HOD can manage faculty only if their department overlaps with target faculty's departments
  if (userHasSystemRole(actor, 'HOD')) {
    const actorDeptIds = new Set(actorDepartments.map((d) => d.id));
    return targetFacultyDepartments.some((d) => actorDeptIds.has(d.id));
  }

  return false;
}

/**
 * Get user's department IDs for access control
 */
export function getUserDepartmentIds(user: IUserWithPermissions | null): string[] {
  if (!user || !user.departments) return [];
  return user.departments.map((d) => d.id);
}

/**
 * Check if user has multiple permissions (AND logic)
 */
export function userHasAllPermissions(
  user: IUserWithPermissions | null,
  permissions: string[],
): boolean {
  return permissions.every((perm) => userHasPermission(user, perm));
}

/**
 * Check if user has any of multiple permissions (OR logic)
 */
export function userHasAnyPermission(
  user: IUserWithPermissions | null,
  permissions: string[],
): boolean {
  return permissions.some((perm) => userHasPermission(user, perm));
}

/**
 * Detailed permission check with reason
 */
export function checkPermissionDetailed(
  user: IUserWithPermissions | null,
  permission: string,
): PermissionCheckResult {
  if (!user) {
    return { allowed: false, reason: 'User not authenticated' };
  }

  if (user.permissions.includes(permission)) {
    return { allowed: true, by: 'role' };
  }

  const customFeature = user.customFeatures.find((f) => f.key === permission);
  if (customFeature && !isFeatureExpired(customFeature) && customFeature.acceptedAt) {
    return { allowed: true, by: 'custom_feature' };
  }

  return { allowed: false, reason: `Missing permission: ${permission}` };
}

// ============================================================
// ROLE CHECKING
// ============================================================

/**
 * Check if user has a specific role
 */
export function userHasRole(user: IUserWithPermissions | null, roleId: string): boolean {
  if (!user) return false;
  return user.roles.some((role) => role.id === roleId);
}

/**
 * Check if user has any of multiple roles
 */
export function userHasAnyRole(user: IUserWithPermissions | null, roleIds: string[]): boolean {
  if (!user) return false;
  return roleIds.some((roleId) => user.roles.some((r) => r.id === roleId));
}

/**
 * Check if user has a system role
 */
export function userHasSystemRole(
  user: IUserWithPermissions | null,
  systemRole: string,
): boolean {
  if (!user) return false;
  return user.roles.some((role) => role.systemRole === systemRole);
}

/**
 * Get user's highest privilege level
 */
export function getUserRoleHierarchy(user: IUserWithPermissions | null): number {
  if (!user) return 0;

  const hierarchy: Record<string, number> = {
    SUPER_ADMIN: 4,
    ADMIN: 3,
    HOD: 2,
    FACULTY: 1,
  };

  let maxLevel = 0;
  for (const role of user.roles) {
    const level = hierarchy[role.systemRole || ''] || 0;
    maxLevel = Math.max(maxLevel, level);
  }

  return maxLevel;
}

// ============================================================
// CUSTOM FEATURE CHECKING
// ============================================================

/**
 * Check if feature is expired
 */
export function isFeatureExpired(feature: ICustomFeatureAssignment): boolean {
  if (!feature.expiryDate) return false;
  return new Date() > new Date(feature.expiryDate);
}

/**
 * Get days until feature expires
 */
export function getDaysUntilExpiry(feature: ICustomFeatureAssignment): number | null {
  if (!feature.expiryDate) return null;
  const diff = new Date(feature.expiryDate).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Check if feature needs acceptance
 */
export function doesFeatureNeedAcceptance(feature: ICustomFeatureAssignment): boolean {
  return feature.requiresAcceptance && !feature.acceptedAt;
}

/**
 * Get feature status
 */
export function getFeatureStatus(
  feature: ICustomFeatureAssignment,
): 'active' | 'pending_acceptance' | 'declined' | 'expired' {
  if (feature.declinedAt) return 'declined';
  if (isFeatureExpired(feature)) return 'expired';
  if (feature.requiresAcceptance && !feature.acceptedAt) return 'pending_acceptance';
  return 'active';
}

/**
 * Get user's active custom features
 */
export function getActiveCustomFeatures(
  user: IUserWithPermissions | null,
): ICustomFeatureAssignment[] {
  if (!user) return [];
  return user.customFeatures.filter(
    (f) => !isFeatureExpired(f) && !f.declinedAt && f.acceptedAt,
  );
}

/**
 * Get user's pending custom features (awaiting acceptance)
 */
export function getPendingCustomFeatures(
  user: IUserWithPermissions | null,
): ICustomFeatureAssignment[] {
  if (!user) return [];
  return user.customFeatures.filter(
    (f) =>
      f.requiresAcceptance &&
      !f.acceptedAt &&
      !f.declinedAt &&
      !isFeatureExpired(f),
  );
}

// ============================================================
// MENU & PAGE VISIBILITY
// ============================================================

/**
 * Check if menu item should be visible
 */
export function shouldShowMenuItem(
  user: IUserWithPermissions | null,
  requiredPermission: string | null,
): boolean {
  if (!requiredPermission) return true; // No permission required
  return userHasPermission(user, requiredPermission);
}

/**
 * Get visible menu items for user
 */
export function getVisibleMenuItems(
  user: IUserWithPermissions | null,
  menuItems: Array<{ key: string; requiredPermission: string | null }>,
) {
  return menuItems.filter((item) => shouldShowMenuItem(user, item.requiredPermission));
}

/**
 * Filter items based on permission
 */
export function filterByPermission<T extends { permissionKey?: string }>(
  items: T[],
  user: IUserWithPermissions | null,
): T[] {
  return items.filter((item) => {
    if (!item.permissionKey) return true;
    return userHasPermission(user, item.permissionKey);
  });
}

// ============================================================
// PERMISSION MATRIX FOR UI
// ============================================================

/**
 * Build permission matrix grouped by module
 */
export function buildPermissionMatrix() {
  const matrix: Record<string, any> = {};

  for (const [key, perm] of Object.entries(PERMISSIONS)) {
    if (!matrix[perm.module]) {
      matrix[perm.module] = {
        module: perm.module,
        permissions: [],
      };
    }
    matrix[perm.module].permissions.push({
      key,
      ...perm,
    });
  }

  return matrix;
}

/**
 * Get permissions for a role
 */
export function getRolePermissions(systemRole: string): string[] {
  return ROLE_PERMISSION_MAP[systemRole] || [];
}

// ============================================================
// SENSITIVE OPERATIONS
// ============================================================

/**
 * Check if operation needs confirmation
 */
export function isOperationSensitive(permission: string): boolean {
  const sensitiveOps = [
    'users.delete',
    'teachers.delete',
    'students.delete',
    'exams.delete',
    'marks.delete',
    'roles.delete',
    'custom_features.delete',
    'billing.edit',
  ];
  return sensitiveOps.includes(permission);
}

/**
 * Get sensitive operations for a role
 */
export function getSensitiveOperationsForRole(permissions: string[]): string[] {
  const sensitiveOps = [
    'users.delete',
    'teachers.delete',
    'students.delete',
    'exams.delete',
    'marks.delete',
    'roles.delete',
    'custom_features.delete',
    'billing.edit',
  ];
  return permissions.filter((p) => sensitiveOps.includes(p));
}

// ============================================================
// PERMISSION VALIDATION
// ============================================================

/**
 * Validate permission exists
 */
export function isValidPermission(permission: string): boolean {
  return permission in PERMISSIONS;
}

/**
 * Get all valid permission keys
 */
export function getAllValidPermissions(): string[] {
  return Object.keys(PERMISSIONS);
}

/**
 * Validate permission module
 */
export function isValidModule(module: string): boolean {
  return Object.values(PERMISSIONS).some((p) => p.module === module);
}

// ============================================================
// HIERARCHY & PRIVILEGE ESCALATION PREVENTION
// ============================================================

/**
 * Check if user can manage another user's roles
 * Prevents privilege escalation
 */
export function canManageUserRoles(
  actor: IUserWithPermissions | null,
  targetUser: IUserWithPermissions | null,
): boolean {
  if (!actor || !targetUser) return false;

  const actorHierarchy = getUserRoleHierarchy(actor);
  const targetHierarchy = getUserRoleHierarchy(targetUser);

  // Can only manage users with lower or equal privilege
  return actorHierarchy > targetHierarchy;
}

/**
 * Check if user can edit their own highest privilege role
 */
export function canEditOwnHighestPrivilege(user: IUserWithPermissions | null): boolean {
  if (!user) return false;
  // Super Admin can edit own highest privilege
  return user.roles.some((r) => r.systemRole === 'SUPER_ADMIN');
}

// ============================================================
// BATCH OPERATIONS
// ============================================================

/**
 * Filter operations a user can perform
 */
export function getAvailableOperations(
  user: IUserWithPermissions | null,
  operations: Array<{ key: string; requiredPermission: string }>,
): Array<{ key: string; requiredPermission: string }> {
  return operations.filter((op) => userHasPermission(user, op.requiredPermission));
}
