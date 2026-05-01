/**
 * RBAC Middleware for API Route Protection (Phase 3)
 * 
 * Comprehensive permission, role, and department-scoped access control
 * Features:
 * - Department scope validation (HOD isolation, Faculty multi-dept)
 * - Permission + Department checking
 * - Custom feature override support
 * - Privilege escalation prevention
 * - Comprehensive audit logging
 * - Backward compatible with Phase 2 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/supabase/middleware';
import {
  userHasAnyPermission,
  userHasAllPermissions,
  userHasPermissionWithDepartment,
  userHasRole,
  userHasSystemRole,
  canAccessDepartment,
  canManageFacultyInDepartment,
  getUserDepartmentIds,
  getUserRoleHierarchy,
  getActiveCustomFeatures,
} from './utils';
import { db } from '@/lib/db';
import { IUserWithPermissions } from '@/types/rbac';

/**
 * Middleware result type
 */
export interface MiddlewareResult {
  allowed: boolean;
  reason?: string;
  status: number;
}

/**
 * Request context with authentication and department info
 */
export interface RequestContext {
  user: IUserWithPermissions;
  schoolId: string;
  departmentId?: string;
  ipAddress?: string;
}

async function buildUserWithPermissions(userId: string): Promise<IUserWithPermissions | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      customFeatures: {
        include: {
          feature: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const permissions = Array.from(
    new Set(
      user.roles.flatMap((assignment) =>
        assignment.role.permissions.map((rolePermission) => rolePermission.permission.key),
      ),
    ),
  );

  const roles = user.roles.map((assignment) => assignment.role as IUserWithPermissions['roles'][number]);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    schoolId: user.schoolId,
    roles,
    permissions,
    customFeatures: user.customFeatures as IUserWithPermissions['customFeatures'],
    hasPermission: (permission: string) => permissions.includes(permission),
    hasFeature: (featureKey: string) =>
      user.customFeatures.some((assignment) => assignment.feature?.key === featureKey),
    hasRole: (roleId: string) => roles.some((role) => role.id === roleId),
  };
}

// ============================================================
// CONTEXT EXTRACTION (NEW - Phase 3)
// ============================================================

/**
 * Extract request context: user, school, department, IP
 */
export async function extractRequestContext(
  request: NextRequest
): Promise<RequestContext | null> {
  const session = await getAppSession(request);

  if (!session) {
    return null;
  }

  const user = session.user ?? (await buildUserWithPermissions(session.userId));

  if (!user) {
    return null;
  }

  const { searchParams, pathname } = new URL(request.url);
  let departmentId = searchParams.get('departmentId') || undefined;
  
  // Try to extract from path: /api/departments/[id]/... or /api/[resource]/[id]
  if (!departmentId) {
    const pathParts = pathname.split('/').filter(Boolean);
    // Look for common patterns: /api/departments/xxx or /api/resources/xxx/departments/yyy
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (pathParts[i] === 'departments' && pathParts[i + 1]) {
        departmentId = pathParts[i + 1];
        break;
      }
    }
  }

  return {
    user,
    schoolId: session.schoolId,
    departmentId,
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
  };
}

// ============================================================
// DEPARTMENT SCOPE CHECKING (NEW - Phase 3)
// ============================================================

/**
 * Check if user can access a specific department
 * - SUPER_ADMIN/ADMIN: Yes to all
 * - HOD: Yes only to own department
 * - FACULTY: Yes only to assigned departments
 */
export async function checkDepartmentAccess(
  context: RequestContext,
  departmentId: string
): Promise<MiddlewareResult> {
  const { user } = context;
  const userDepts = getUserDepartmentIds(user).map((id) => ({ id }));

  if (!canAccessDepartment(user, departmentId, userDepts)) {
    await logUnauthorizedAccess(
      user.id,
      'DEPARTMENT_ACCESS_DENIED',
      context.ipAddress || 'unknown',
      { departmentId }
    );

    return {
      allowed: false,
      reason: `No access to department: ${departmentId}`,
      status: 403,
    };
  }

  return { allowed: true, status: 200 };
}

/**
 * Check if HOD can manage faculty in specific departments
 * HOD can only manage faculty if they have overlapping department assignments
 */
export async function checkCanManageFaculty(
  context: RequestContext,
  targetFacultyDepartments: string[]
): Promise<MiddlewareResult> {
  const { user } = context;
  const actorDepts = getUserDepartmentIds(user).map((id) => ({ id }));
  const targetDepts = targetFacultyDepartments.map((id) => ({ id }));

  if (!canManageFacultyInDepartment(user, targetDepts, actorDepts)) {
    return {
      allowed: false,
      reason: 'Cannot manage faculty outside assigned departments',
      status: 403,
    };
  }

  return { allowed: true, status: 200 };
}

// ============================================================
// CUSTOM FEATURE CHECKING (NEW - Phase 3)
// ============================================================

/**
 * Check if user has custom feature with override
 * Can be used to bypass standard permission checks
 * for temporary access or testing
 */
export async function checkCustomFeatureOverride(
  user: IUserWithPermissions,
  featureKey: string
): Promise<boolean> {
  const activeFeatures = getActiveCustomFeatures(user);
  return activeFeatures.some((f) => f.feature?.key === featureKey);
}

// ============================================================
// PRIVILEGE ESCALATION PREVENTION (NEW - Phase 3)
// ============================================================

/**
 * Check if actor can modify target user (prevent privilege escalation)
 */
export async function checkCanModifyUser(
  context: RequestContext,
  targetUserId: string,
  targetUserHierarchyLevel: number
): Promise<MiddlewareResult> {
  const { user } = context;
  const actorHierarchy = getUserRoleHierarchy(user);

  if (actorHierarchy <= targetUserHierarchyLevel) {
    await logUnauthorizedAccess(
      user.id,
      'PRIVILEGE_ESCALATION_ATTEMPT',
      context.ipAddress || 'unknown',
      { targetUserId, actorHierarchy, targetHierarchy: targetUserHierarchyLevel }
    );

    return {
      allowed: false,
      reason: 'Cannot modify user with equal or higher privilege',
      status: 403,
    };
  }

  return { allowed: true, status: 200 };
}

// ============================================================
// PHASE 2 BACKWARD COMPATIBLE FUNCTIONS (Existing)
// ============================================================

/**
 * Check if user has required permission (Phase 2)
 */
export async function checkPermissionMiddleware(
  request: NextRequest,
  requiredPermission: string
): Promise<MiddlewareResult> {
  try {
    const session = await getAppSession(request);

    if (!session) {
      return {
        allowed: false,
        reason: 'Not authenticated',
        status: 401,
      };
    }

    const user = session.user ?? (await buildUserWithPermissions(session.userId));

    if (!user) {
      return {
        allowed: false,
        reason: 'Not authenticated',
        status: 401,
      };
    }

    const hasPermission = userHasAnyPermission(user, [requiredPermission]);

    if (!hasPermission) {
      await logUnauthorizedAccess(
        user.id,
        requiredPermission,
        request.ip || 'unknown'
      );

      return {
        allowed: false,
        reason: `Missing permission: ${requiredPermission}`,
        status: 403,
      };
    }

    return {
      allowed: true,
      status: 200,
    };
  } catch (error) {
    console.error('Permission middleware error:', error);
    return {
      allowed: false,
      reason: 'Permission check failed',
      status: 500,
    };
  }
}

/**
 * Check if user has required role (Phase 2)
 */
export async function checkRoleMiddleware(
  request: NextRequest,
  requiredRoleId: string
): Promise<MiddlewareResult> {
  try {
    const session = await getAppSession(request);

    if (!session) {
      return {
        allowed: false,
        reason: 'Not authenticated',
        status: 401,
      };
    }

    const user = session.user ?? (await buildUserWithPermissions(session.userId));

    if (!user) {
      return {
        allowed: false,
        reason: 'Not authenticated',
        status: 401,
      };
    }

    const hasRole = userHasRole(user, requiredRoleId);

    if (!hasRole) {
      return {
        allowed: false,
        reason: `Missing role: ${requiredRoleId}`,
        status: 403,
      };
    }

    return {
      allowed: true,
      status: 200,
    };
  } catch (error) {
    console.error('Role middleware error:', error);
    return {
      allowed: false,
      reason: 'Role check failed',
      status: 500,
    };
  }
}

/**
 * Check if user is Super Admin (Phase 2)
 */
export async function checkSuperAdminMiddleware(
  request: NextRequest
): Promise<MiddlewareResult> {
  try {
    const session = await getAppSession(request);

    if (!session) {
      return {
        allowed: false,
        reason: 'Not authenticated',
        status: 401,
      };
    }

    const user = session.user ?? (await buildUserWithPermissions(session.userId));

    if (!user) {
      return {
        allowed: false,
        reason: 'Not authenticated',
        status: 401,
      };
    }

    const superAdminRole = await db.role.findFirst({
      where: {
        systemRole: 'SUPER_ADMIN',
      },
    });

    if (!superAdminRole) {
      return {
        allowed: false,
        reason: 'Super Admin role not found',
        status: 500,
      };
    }

    const isSuperAdmin = userHasRole(user, superAdminRole.id);

    if (!isSuperAdmin) {
      return {
        allowed: false,
        reason: 'Super Admin access required',
        status: 403,
      };
    }

    return {
      allowed: true,
      status: 200,
    };
  } catch (error) {
    console.error('Super Admin middleware error:', error);
    return {
      allowed: false,
      reason: 'Super Admin check failed',
      status: 500,
    };
  }
}

/**
 * Log unauthorized access attempt with metadata
 */
export async function logUnauthorizedAccess(
  userId: string,
  action: string,
  ipAddress: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // Fetch school ID for logging
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user) return;

    await db.rBACLog.create({
      data: {
        schoolId: user.schoolId,
        actorId: userId,
        action,
        targetType: 'api_access',
        targetId: ipAddress,
        metadata: metadata || {},
      },
    });
  } catch (error) {
    console.error('Failed to log unauthorized access:', error);
  }
}

// ============================================================
// PHASE 2 DECORATORS (Backward Compatible)
// ============================================================

/**
 * Require permission on an API route (Phase 2)
 */
export function withPermission(
  requiredPermission: string,
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const result = await checkPermissionMiddleware(request, requiredPermission);

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: result.reason || 'Permission denied',
        },
        { status: result.status }
      );
    }

    return handler(request);
  };
}

/**
 * Require role on an API route (Phase 2)
 */
export function withRole(
  requiredRoleId: string,
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const result = await checkRoleMiddleware(request, requiredRoleId);

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: result.reason || 'Role required',
        },
        { status: result.status }
      );
    }

    return handler(request);
  };
}

/**
 * Require Super Admin on an API route (Phase 2)
 */
export function withSuperAdmin(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const result = await checkSuperAdminMiddleware(request);

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: result.reason || 'Super Admin access required',
        },
        { status: result.status }
      );
    }

    return handler(request);
  };
}

/**
 * Require multiple permissions (AND logic) (Phase 2)
 */
export function withPermissions(
  requiredPermissions: string[],
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      const session = await getAppSession(request);

      if (!session) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        );
      }

      const user = session.user ?? (await buildUserWithPermissions(session.userId));

      if (!user) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        );
      }

      const hasAllPermissions = userHasAllPermissions(user, requiredPermissions);

      if (!hasAllPermissions) {
        await logUnauthorizedAccess(
          user.id,
          'PERMISSION_DENIED',
          request.ip || 'unknown',
          { permissions: requiredPermissions }
        );

        return NextResponse.json(
          { error: 'Missing required permissions' },
          { status: 403 }
        );
      }

      return handler(request);
    } catch (error) {
      console.error('Permission check error:', error);
      return NextResponse.json(
        { error: 'Permission check failed' },
        { status: 500 }
      );
    }
  };
}

/**
 * Require any of multiple permissions (OR logic) (Phase 2)
 */
export function withAnyPermission(
  requiredPermissions: string[],
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      const session = await getAppSession(request);

      if (!session) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        );
      }

      const user = session.user ?? (await buildUserWithPermissions(session.userId));

      if (!user) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        );
      }

      const hasAnyPermission = userHasAnyPermission(user, requiredPermissions);

      if (!hasAnyPermission) {
        await logUnauthorizedAccess(
          user.id,
          'PERMISSION_DENIED',
          request.ip || 'unknown',
          { permissions: requiredPermissions, logic: 'OR' }
        );

        return NextResponse.json(
          { error: 'Missing required permissions' },
          { status: 403 }
        );
      }

      return handler(request);
    } catch (error) {
      console.error('Permission check error:', error);
      return NextResponse.json(
        { error: 'Permission check failed' },
        { status: 500 }
      );
    }
  };
}

// ============================================================
// PHASE 3 DECORATORS (New - Department-Scoped)
// ============================================================

/**
 * Require authentication only, returns context (Phase 3)
 * Usage:
 * export const GET = withContext(async (request, context) => { ... });
 */
export function withContext(
  handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const context = await extractRequestContext(request);

    if (!context) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return handler(request, context);
  };
}

/**
 * Require permission with department scope (Phase 3)
 * Checks: Permission + Department access
 * Usage:
 * export const GET = withPermissionAndDepartment(
 *   'exams.edit',
 *   async (request, context) => { ... }
 * );
 */
export function withPermissionAndDepartment(
  permission: string,
  handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const context = await extractRequestContext(request);

    if (!context) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permission
    const permCheck = await checkPermissionMiddleware(request, permission);
    if (!permCheck.allowed) {
      return NextResponse.json(
        { error: permCheck.reason || 'Permission denied' },
        { status: permCheck.status }
      );
    }

    // Check department if specified
    if (context.departmentId) {
      const deptCheck = await checkDepartmentAccess(context, context.departmentId);
      if (!deptCheck.allowed) {
        return NextResponse.json(
          { error: deptCheck.reason || 'Department access denied' },
          { status: deptCheck.status }
        );
      }
    }

    return handler(request, context);
  };
}

/**
 * Require system role (Phase 3)
 * Usage:
 * export const GET = withSystemRole('HOD', async (request, context) => { ... });
 */
export function withSystemRole(
  ...roles: string[]
) {
  return (handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse>) => {
    return async (request: NextRequest) => {
      const context = await extractRequestContext(request);

      if (!context) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const hasRole = roles.some((role) =>
        userHasSystemRole(context.user, role)
      );

      if (!hasRole) {
        await logUnauthorizedAccess(
          context.user.id,
          'SYSTEM_ROLE_DENIED',
          context.ipAddress || 'unknown',
          { requiredRoles: roles }
        );

        return NextResponse.json(
          { error: `Required role: ${roles.join(' or ')}` },
          { status: 403 }
        );
      }

      return handler(request, context);
    };
  };
}

/**
 * Require admin access (ADMIN or SUPER_ADMIN) (Phase 3)
 */
export function withAdmin(
  handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse>
) {
  return withSystemRole('ADMIN', 'SUPER_ADMIN')(handler);
}

/**
 * Require department scope access (Phase 3)
 * Validates user can access the departmentId from query/path
 */
export function withDepartmentScope(
  handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const context = await extractRequestContext(request);

    if (!context) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!context.departmentId) {
      return NextResponse.json(
        { error: 'Department ID required' },
        { status: 400 }
      );
    }

    const deptCheck = await checkDepartmentAccess(context, context.departmentId);
    if (!deptCheck.allowed) {
      return NextResponse.json(
        { error: deptCheck.reason || 'Department access denied' },
        { status: deptCheck.status }
      );
    }

    return handler(request, context);
  };
}

/**
 * Require permission with department scope validation (Phase 3 Advanced)
 * Three-layer check: Auth + Permission + Department
 */
export function withPermissionDepartmentScope(
  permission: string | string[],
  handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const context = await extractRequestContext(request);

    if (!context) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Layer 1: Check permission
    const permissions = Array.isArray(permission) ? permission : [permission];
    const hasPermission = userHasAllPermissions(context.user, permissions);

    if (!hasPermission) {
      await logUnauthorizedAccess(
        context.user.id,
        'PERMISSION_DENIED',
        context.ipAddress || 'unknown',
        { permissions }
      );

      return NextResponse.json(
        { error: `Missing permission: ${permissions.join(', ')}` },
        { status: 403 }
      );
    }

    // Layer 2: Check department if specified
    if (context.departmentId) {
      const deptCheck = await checkDepartmentAccess(context, context.departmentId);
      if (!deptCheck.allowed) {
        return NextResponse.json(
          { error: deptCheck.reason || 'Department access denied' },
          { status: deptCheck.status }
        );
      }
    }

    // Layer 3: Allow handler to check data ownership if needed
    return handler(request, context);
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Extract and validate department ID from request
 */
export function extractDepartmentId(request: NextRequest): string | null {
  const { searchParams, pathname } = new URL(request.url);
  
  let departmentId = searchParams.get('departmentId');
  if (departmentId) return departmentId;

  const pathParts = pathname.split('/').filter(Boolean);
  for (let i = 0; i < pathParts.length - 1; i++) {
    if (pathParts[i] === 'departments' && pathParts[i + 1]) {
      return pathParts[i + 1];
    }
  }

  return null;
}

/**
 * Extract pagination from query params
 */
export function extractPagination(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return {
    page: Math.max(0, parseInt(searchParams.get('page') || '0')),
    limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20'))),
  };
}

/**
 * Send error response
 */
export const sendError = (message: string, status: number = 400) =>
  NextResponse.json({ error: message }, { status });

/**
 * Send success response
 */
export const sendSuccess = (data: any, status: number = 200) =>
  NextResponse.json(data, { status });

/**
 * Send created response
 */
export const sendCreated = (data: any) =>
  NextResponse.json(data, { status: 201 });

/**
 * Export all utilities as named exports
 */
export const Middleware = {
  extractRequestContext,
  extractDepartmentId,
  extractPagination,
  checkPermissionMiddleware,
  checkRoleMiddleware,
  checkSuperAdminMiddleware,
  checkDepartmentAccess,
  checkCanManageFaculty,
  checkCanModifyUser,
  checkCustomFeatureOverride,
  logUnauthorizedAccess,
  withContext,
  withPermission,
  withPermissions,
  withAnyPermission,
  withPermissionAndDepartment,
  withPermissionDepartmentScope,
  withRole,
  withSystemRole,
  withAdmin,
  withSuperAdmin,
  withDepartmentScope,
  sendError,
  sendSuccess,
  sendCreated,
};
