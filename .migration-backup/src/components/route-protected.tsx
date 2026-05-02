'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IUserWithPermissions } from '@/types/rbac';
import { userHasAnyPermission, userHasAllPermissions, userHasRole } from '@/lib/rbac/utils';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

/**
 * Props for route protection wrapper
 */
interface ProtectedRouteProps {
  /** Component to render if authorized */
  children: React.ComponentType<any>;
  /** User performing the request */
  user?: IUserWithPermissions | null;
  /** Required permission */
  requiredPermission?: string;
  /** Required permissions (all must be present) */
  requiredPermissions?: string[];
  /** Required role ID */
  requiredRoleId?: string;
  /** Required role IDs (any can be present) */
  requiredRoleIds?: string[];
  /** Redirect URL if not authorized */
  redirectTo?: string;
  /** Loading component */
  loadingComponent?: ReactNode;
  /** Unauthorized component */
  unauthorizedComponent?: ReactNode;
  /** Whether to check on every render */
  checkOnMount?: boolean;
  /** Callback when access is denied */
  onAccessDenied?: () => void;
}

/**
 * Default unauthorized fallback component
 */
function DefaultUnauthorizedComponent() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center gap-4 text-red-600 mb-4">
          <AlertCircle className="w-8 h-8" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
        </div>
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page.
        </p>
        <a
          href="/dashboard"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go Back Home
        </a>
      </Card>
    </div>
  );
}

/**
 * HOC to protect routes with permission/role checks
 *
 * @example
 * // Protect with single permission
 * export default withProtectedRoute(YourPage, {
 *   requiredPermission: 'users.view'
 * });
 *
 * @example
 * // Protect with multiple permissions (all required)
 * export default withProtectedRoute(YourPage, {
 *   requiredPermissions: ['users.create', 'users.edit']
 * });
 *
 * @example
 * // Protect with role
 * export default withProtectedRoute(YourPage, {
 *   requiredRoleId: adminRoleId,
 *   redirectTo: '/unauthorized'
 * });
 */
export function withProtectedRoute(
  Component: React.ComponentType<any>,
  options: {
    requiredPermission?: string;
    requiredPermissions?: string[];
    requiredRoleId?: string;
    requiredRoleIds?: string[];
    redirectTo?: string;
    loadingComponent?: ReactNode;
    unauthorizedComponent?: ReactNode;
    checkOnMount?: boolean;
  } = {}
) {
  return function ProtectedComponent(props: any) {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const user = props.user as IUserWithPermissions | undefined;

    useEffect(() => {
      if (!user) {
        setIsAuthorized(false);
        return;
      }

      let authorized = true;

      // Check single permission
      if (options.requiredPermission) {
        authorized = userHasAnyPermission(user, [options.requiredPermission]);
      }

      // Check multiple permissions (all required)
      if (authorized && options.requiredPermissions?.length) {
        authorized = options.requiredPermissions.every((perm) =>
          userHasAnyPermission(user, [perm])
        );
      }

      // Check single role
      if (authorized && options.requiredRoleId) {
        authorized = userHasRole(user, options.requiredRoleId);
      }

      // Check multiple roles (any required)
      if (authorized && options.requiredRoleIds?.length) {
        const userRoleIds = user.roles?.map((r) => r.id) || [];
        authorized = options.requiredRoleIds.some((rid) =>
          userRoleIds.includes(rid)
        );
      }

      setIsAuthorized(authorized);

      // Redirect if not authorized
      if (!authorized && options.redirectTo) {
        router.push(options.redirectTo);
      }
    }, [user, router, options]);

    // Still loading
    if (isAuthorized === null) {
      return options.loadingComponent || <DefaultLoadingComponent />;
    }

    // Not authorized
    if (!isAuthorized) {
      return options.unauthorizedComponent || <DefaultUnauthorizedComponent />;
    }

    // Authorized - render component
    return <Component {...props} user={user} />;
  };
}

/**
 * Default loading component
 */
function DefaultLoadingComponent() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Verifying access...</p>
      </Card>
    </div>
  );
}

/**
 * Props for ProtectedPage component wrapper
 */
interface ProtectedPageWrapperProps {
  /** Page title for display */
  title: string;
  /** User context */
  user?: IUserWithPermissions | null;
  /** Required permission */
  requiredPermission?: string;
  /** Required permissions (all must be present) */
  requiredPermissions?: string[];
  /** Required role ID */
  requiredRoleId?: string;
  /** Required role IDs (any can be present) */
  requiredRoleIds?: string[];
  /** Page content */
  children: ReactNode;
  /** Loading component */
  loadingComponent?: ReactNode;
  /** Unauthorized component */
  unauthorizedComponent?: ReactNode;
  /** Callback when access is denied */
  onAccessDenied?: () => void;
  /** Show title header */
  showHeader?: boolean;
}

/**
 * Wrapper component for pages that require permissions
 * Handles loading, authorization checks, and error states
 *
 * @example
 * export default function YourPage({ user }) {
 *   return (
 *     <ProtectedPageWrapper
 *       title="User Management"
 *       user={user}
 *       requiredPermission="users.view"
 *     >
 *       <UserTable />
 *     </ProtectedPageWrapper>
 *   );
 * }
 */
export function ProtectedPageWrapper({
  title,
  user,
  requiredPermission,
  requiredPermissions,
  requiredRoleId,
  requiredRoleIds,
  children,
  loadingComponent,
  unauthorizedComponent,
  onAccessDenied,
  showHeader = true,
}: ProtectedPageWrapperProps) {
  const [isAuthorized, setIsAuthorized] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (!user) {
      setIsAuthorized(false);
      onAccessDenied?.();
      return;
    }

    let authorized = true;

    // Check single permission
    if (requiredPermission) {
      authorized = userHasAnyPermission(user, [requiredPermission]);
    }

    // Check multiple permissions (all required)
    if (authorized && requiredPermissions?.length) {
      authorized = requiredPermissions.every((perm) =>
        userHasAnyPermission(user, [perm])
      );
    }

    // Check single role
    if (authorized && requiredRoleId) {
      authorized = userHasRole(user, requiredRoleId);
    }

    // Check multiple roles (any required)
    if (authorized && requiredRoleIds?.length) {
      const userRoleIds = user.roles?.map((r) => r.id) || [];
      authorized = requiredRoleIds.some((rid) => userRoleIds.includes(rid));
    }

    setIsAuthorized(authorized);

    if (!authorized) {
      onAccessDenied?.();
    }
  }, [user, requiredPermission, requiredPermissions, requiredRoleId, requiredRoleIds, onAccessDenied]);

  // Still loading
  if (isAuthorized === null) {
    return loadingComponent || <DefaultLoadingComponent />;
  }

  // Not authorized
  if (!isAuthorized) {
    return unauthorizedComponent || <DefaultUnauthorizedComponent />;
  }

  // Authorized - render content
  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="border-b">
          <h1 className="text-3xl font-bold">{title}</h1>
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * Simple hook for checking if user is authorized
 */
export function useAuthorization(options: {
  requiredPermission?: string;
  requiredPermissions?: string[];
  requiredRoleId?: string;
  requiredRoleIds?: string[];
}) {
  const [isAuthorized, setIsAuthorized] = React.useState(false);

  const checkAuthorization = React.useCallback(
    (user: IUserWithPermissions | undefined) => {
      if (!user) {
        setIsAuthorized(false);
        return false;
      }

      let authorized = true;

      if (options.requiredPermission) {
        authorized = userHasAnyPermission(user, [options.requiredPermission]);
      }

      if (authorized && options.requiredPermissions?.length) {
        authorized = options.requiredPermissions.every((perm) =>
          userHasAnyPermission(user, [perm])
        );
      }

      if (authorized && options.requiredRoleId) {
        authorized = userHasRole(user, options.requiredRoleId);
      }

      if (authorized && options.requiredRoleIds?.length) {
        const userRoleIds = user.roles?.map((r) => r.id) || [];
        authorized = options.requiredRoleIds.some((rid) =>
          userRoleIds.includes(rid)
        );
      }

      setIsAuthorized(authorized);
      return authorized;
    },
    [options]
  );

  return { isAuthorized, checkAuthorization };
}
