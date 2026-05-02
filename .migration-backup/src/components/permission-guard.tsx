'use client';

import React, { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { IUserWithPermissions } from '@/types/rbac';
import {
  userHasAnyPermission,
  userHasAllPermissions,
} from '@/lib/rbac/utils';

/**
 * Props for PermissionGuard component
 */
interface PermissionGuardProps {
  /** User to check permissions for */
  user?: IUserWithPermissions | null;
  /** Single permission to require */
  permission?: string;
  /** Multiple permissions (AND logic - all required) */
  permissions?: string[];
  /** Multiple permissions (OR logic - any required) */
  anyPermission?: string[];
  /** Content to show if user has permission */
  children: ReactNode;
  /** Content to show if user lacks permission */
  fallback?: ReactNode;
  /** If true, don't show anything (no fallback) when denied */
  silent?: boolean;
}

/**
 * Component-level permission guard
 * Shows children only if user has required permission(s)
 *
 * @example
 * // Single permission
 * <PermissionGuard user={user} permission="users.delete">
 *   <DeleteButton />
 * </PermissionGuard>
 *
 * @example
 * // Multiple permissions (all required)
 * <PermissionGuard user={user} permissions={['users.create', 'users.edit']}>
 *   <UserForm />
 * </PermissionGuard>
 *
 * @example
 * // Any permission
 * <PermissionGuard user={user} anyPermission={['admin.view', 'teacher.view']}>
 *   <ReportSection />
 * </PermissionGuard>
 *
 * @example
 * // With fallback
 * <PermissionGuard
 *   user={user}
 *   permission="users.delete"
 *   fallback={<p>You don't have permission to delete users</p>}
 * >
 *   <DeleteButton />
 * </PermissionGuard>
 */
export function PermissionGuard({
  user,
  permission,
  permissions,
  anyPermission,
  children,
  fallback = null,
  silent = false,
}: PermissionGuardProps): ReactNode {
  const hasPermission = useMemo(() => {
    if (!user) return false;

    // Single permission check
    if (permission) {
      return userHasAnyPermission(user, [permission]);
    }

    // All permissions check (AND logic)
    if (permissions && permissions.length > 0) {
      return userHasAllPermissions(user, permissions);
    }

    // Any permission check (OR logic)
    if (anyPermission && anyPermission.length > 0) {
      return userHasAnyPermission(user, anyPermission);
    }

    return false;
  }, [user, permission, permissions, anyPermission]);

  if (!hasPermission) {
    return silent ? null : fallback;
  }

  return children;
}

/**
 * Props for RoleGuard component
 */
interface RoleGuardProps {
  /** User to check roles for */
  user?: IUserWithPermissions | null;
  /** Role IDs that are allowed */
  roleIds: string[];
  /** Whether all roles are required (true) or any role (false) */
  requireAll?: boolean;
  /** Content to show if user has role */
  children: ReactNode;
  /** Content to show if user lacks role */
  fallback?: ReactNode;
  /** If true, don't show anything when denied */
  silent?: boolean;
}

/**
 * Role-based guard component
 * Shows children only if user has required role(s)
 *
 * @example
 * // Any of the roles
 * <RoleGuard user={user} roleIds={[adminRoleId, superAdminRoleId]}>
 *   <AdminPanel />
 * </RoleGuard>
 *
 * @example
 * // All of the roles (requireAll)
 * <RoleGuard
 *   user={user}
 *   roleIds={[roleId1, roleId2]}
 *   requireAll={true}
 * >
 *   <SpecialFeature />
 * </RoleGuard>
 */
export function RoleGuard({
  user,
  roleIds,
  requireAll = false,
  children,
  fallback = null,
  silent = false,
}: RoleGuardProps): ReactNode {
  const hasRole = useMemo(() => {
    if (!user || !roleIds.length) return false;

    const userRoleIds = user.roles?.map((r) => r.id) || [];

    if (requireAll) {
      // All roles required
      return roleIds.every((rid) => userRoleIds.includes(rid));
    } else {
      // Any role required
      return roleIds.some((rid) => userRoleIds.includes(rid));
    }
  }, [user, roleIds, requireAll]);

  if (!hasRole) {
    return silent ? null : fallback;
  }

  return children;
}

/**
 * Props for FeatureGuard component
 */
interface FeatureGuardProps {
  /** User to check custom features for */
  user?: IUserWithPermissions | null;
  /** Feature key(s) to require */
  featureKey: string | string[];
  /** Whether all features are required (true) or any feature (false) */
  requireAll?: boolean;
  /** Content to show if user has feature */
  children: ReactNode;
  /** Content to show if user lacks feature */
  fallback?: ReactNode;
  /** If true, don't show anything when denied */
  silent?: boolean;
}

/**
 * Custom feature guard component
 * Shows children only if user has access to custom feature(s)
 *
 * @example
 * // Single feature
 * <FeatureGuard user={user} featureKey="attendance.correction">
 *   <AttendanceCorrectionPanel />
 * </FeatureGuard>
 *
 * @example
 * // Multiple features (any)
 * <FeatureGuard
 *   user={user}
 *   featureKey={['lab.inventory', 'lab.equipment']}
 * >
 *   <LabManagementPanel />
 * </FeatureGuard>
 */
export function FeatureGuard({
  user,
  featureKey,
  requireAll = false,
  children,
  fallback = null,
  silent = false,
}: FeatureGuardProps): ReactNode {
  const hasFeature = useMemo(() => {
    if (!user) return false;

    const activeFeatures = user.customFeatures?.filter((f) => {
      // Check if expired
      if (f.expiryDate && new Date(f.expiryDate) < new Date()) {
        return false;
      }
      // Check if accepted (if required)
      if (f.requiresAcceptance && !f.acceptedAt) {
        return false;
      }
      return true;
    }) || [];

    const userFeatureKeys = activeFeatures.map((f) => f.feature?.key).filter(Boolean);
    const requiredFeatures = Array.isArray(featureKey)
      ? featureKey
      : [featureKey];

    if (requireAll) {
      return requiredFeatures.every((fk) => userFeatureKeys.includes(fk));
    } else {
      return requiredFeatures.some((fk) => userFeatureKeys.includes(fk));
    }
  }, [user, featureKey, requireAll]);

  if (!hasFeature) {
    return silent ? null : fallback;
  }

  return children;
}

/**
 * Props for SensitiveOperation component
 */
interface SensitiveOperationProps {
  /** User performing the operation */
  user?: IUserWithPermissions | null;
  /** Permission being checked */
  permission: string;
  /** Content to show if operation is allowed */
  children: ReactNode;
  /** Content to show if operation is sensitive but allowed (confirm needed) */
  confirmPrompt?: string;
  /** Callback when operation is confirmed */
  onConfirm?: () => void;
  /** Callback when operation is denied */
  onDeny?: () => void;
  /** Fallback if denied */
  fallback?: ReactNode;
  /** If true, don't show anything when denied */
  silent?: boolean;
}

/**
 * Wrapper for sensitive operations that may require confirmation
 * Shows confirmation dialog for operations like delete, billing changes
 *
 * @example
 * <SensitiveOperation
 *   user={user}
 *   permission="users.delete"
 *   confirmPrompt="Are you sure you want to delete this user?"
 *   onConfirm={handleDelete}
 * >
 *   <DeleteButton />
 * </SensitiveOperation>
 */
export function SensitiveOperation({
  user,
  permission,
  children,
  confirmPrompt,
  onConfirm,
  onDeny,
  fallback = null,
  silent = false,
}: SensitiveOperationProps): ReactNode {
  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();

      if (!user) {
        onDeny?.();
        return;
      }

      const hasPermission = permission ? userHasAnyPermission(user, [permission]) : true;

      if (!hasPermission) {
        onDeny?.();
        return;
      }

      // If no confirm needed, just call onConfirm
      if (!confirmPrompt) {
        onConfirm?.();
        return;
      }

      // Show confirmation dialog
      if (window.confirm(confirmPrompt)) {
        onConfirm?.();
      } else {
        onDeny?.();
      }
    },
    [user, permission, confirmPrompt, onConfirm, onDeny]
  );

  const hasPermission = user && permission ? userHasAnyPermission(user, [permission]) : !!user;

  if (!hasPermission) {
    return silent ? null : fallback;
  }

  // Wrap children and add onClick handler
  if (React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: handleClick,
    });
  }

  return children;
}

/**
 * Props for ConditionalRender component
 */
interface ConditionalRenderProps {
  /** User context */
  user?: IUserWithPermissions | null;
  /** Check function that returns boolean */
  check: (user: IUserWithPermissions | null | undefined) => boolean;
  /** Content to show if check passes */
  children: ReactNode;
  /** Content to show if check fails */
  fallback?: ReactNode;
}

/**
 * Generic conditional render component for custom permission logic
 *
 * @example
 * <ConditionalRender
 *   user={user}
 *   check={(u) => u && new Date(u.createdAt) > new Date('2025-01-01')}
 * >
 *   <NewUserFeature />
 * </ConditionalRender>
 */
export function ConditionalRender({
  user,
  check,
  children,
  fallback = null,
}: ConditionalRenderProps): ReactNode {
  const result = useMemo(() => {
    return check(user);
  }, [user, check]);

  return result ? children : fallback;
}
