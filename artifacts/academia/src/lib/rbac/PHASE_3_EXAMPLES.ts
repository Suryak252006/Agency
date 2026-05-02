/**
 * Phase 3 Implementation Examples
 * 
 * Shows how to implement:
 * - Backend permission middleware in API routes
 * - Department-scoped access control
 * - Privilege escalation prevention
 * - Frontend permission guards
 */

// ============================================================
// EXAMPLE 1: HOD-Only Marks Approval (Department-Scoped)
// ============================================================

/**
 * File: src/app/api/marks/[id]/approve/route.ts
 * 
 * Requirements:
 * - User must be HOD or ADMIN
 * - User must have 'marks.approve' permission
 * - User can only approve marks in their assigned department
 * - Must prevent HOD from approving marks outside their dept
 */

/*
import { NextRequest, NextResponse } from 'next/server';
import {
  withPermissionDepartmentScope,
  extractRequestContext,
  Middleware,
} from '@/lib/rbac/middleware';
import { prisma } from '@/lib/db';

export const PATCH = withPermissionDepartmentScope(
  'marks.approve',
  async (request: NextRequest, context) => {
    try {
      const markId = request.nextUrl.pathname.split('/')[3];
      const { status, remarks } = await request.json();

      // Fetch the mark with exam + department info
      const mark = await prisma.marks.findUnique({
        where: { id: markId },
        include: {
          exam: {
            include: { department: true },
          },
        },
      });

      if (!mark) {
        return Middleware.sendError('Mark not found', 404);
      }

      // Layer 3: Check data ownership
      // Verify mark's department matches user's departments
      if (
        mark.exam.departmentId &&
        !context.user.departmentsHead?.some(
          (d) => d.id === mark.exam.departmentId
        )
      ) {
        return Middleware.sendError(
          `Cannot approve marks outside your department`,
          403
        );
      }

      // Update mark
      const updated = await prisma.marks.update({
        where: { id: markId },
        data: {
          status,
          remarks,
          approvedBy: context.user.id,
          approvedAt: new Date(),
        },
      });

      return Middleware.sendSuccess(updated);
    } catch (error) {
      console.error('Approve marks error:', error);
      return Middleware.sendError('Internal server error', 500);
    }
  }
);
*/

// ============================================================
// EXAMPLE 2: Faculty Exam Management (Multi-Dept Faculty)
// ============================================================

/**
 * File: src/app/api/exams/route.ts
 * 
 * Requirements:
 * - User must have 'exams.view' permission
 * - Faculty can only view exams in their assigned departments
 * - HOD can view exams in their department
 * - Admin can view all exams
 */

/*
import { NextRequest } from 'next/server';
import {
  withContext,
  extractPagination,
  Middleware,
} from '@/lib/rbac/middleware';
import { prisma } from '@/lib/db';
import {
  userHasPermission,
  userHasSystemRole,
  getUserDepartmentIds,
  canAccessDepartment,
} from '@/lib/rbac/utils';

export const GET = withContext(async (request: NextRequest, context) => {
  try {
    // Layer 1: Check permission
    if (!userHasPermission(context.user, 'exams.view')) {
      return Middleware.sendError('Permission denied', 403);
    }

    const { page, limit } = extractPagination(request);

    // Layer 2: Build query based on user role
    let where: any = {
      schoolId: context.schoolId,
    };

    // SUPER_ADMIN/ADMIN: No department restriction
    if (!userHasSystemRole(context.user, 'ADMIN')) {
      // HOD/FACULTY: Only their departments
      const userDepts = getUserDepartmentIds(context.user);

      if (userDepts.length === 0) {
        // No departments assigned
        return Middleware.sendSuccess({ data: [], total: 0, page, limit });
      }

      where.departmentId = {
        in: userDepts,
      };
    }

    // Fetch exams
    const [exams, total] = await Promise.all([
      prisma.exam.findMany({
        where,
        skip: page * limit,
        take: limit,
        include: {
          department: true,
          class: true,
          createdBy: {
            select: { id: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.exam.count({ where }),
    ]);

    return Middleware.sendSuccess({
      data: exams,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Get exams error:', error);
    return Middleware.sendError('Internal server error', 500);
  }
});
*/

// ============================================================
// EXAMPLE 3: Prevent Privilege Escalation
// ============================================================

/**
 * File: src/app/api/users/[id]/assign-role/route.ts
 * 
 * Requirements:
 * - Only ADMIN can assign roles
 * - Cannot assign role equal or higher than self
 * - HOD cannot assign roles outside their department
 */

/*
import { NextRequest } from 'next/server';
import {
  withContext,
  checkCanModifyUser,
  Middleware,
} from '@/lib/rbac/middleware';
import { prisma } from '@/lib/db';
import {
  userHasSystemRole,
  getUserRoleHierarchy,
  canManageFacultyInDepartment,
} from '@/lib/rbac/utils';

export const POST = withContext(async (request: NextRequest, context) => {
  try {
    const userId = request.nextUrl.pathname.split('/')[3];
    const { roleId, departmentId } = await request.json();

    // Layer 1: Only ADMIN
    if (!userHasSystemRole(context.user, 'ADMIN', 'SUPER_ADMIN')) {
      return Middleware.sendError('Admin access required', 403);
    }

    // Fetch target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        departmentsHead: true,
      },
    });

    if (!targetUser) {
      return Middleware.sendError('User not found', 404);
    }

    // Layer 2: Check privilege escalation
    const targetHierarchy = getUserRoleHierarchy(targetUser);
    const canModify = await checkCanModifyUser(
      context,
      userId,
      targetHierarchy
    );

    if (!canModify.allowed) {
      return Middleware.sendError(canModify.reason, canModify.status);
    }

    // Layer 3: Fetch role and check hierarchy
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return Middleware.sendError('Role not found', 404);
    }

    // Verify actor has higher privilege
    const actorHierarchy = getUserRoleHierarchy(context.user);
    if (role.systemRole) {
      const roleHierarchies: Record<string, number> = {
        SUPER_ADMIN: 4,
        ADMIN: 3,
        HOD: 2,
        FACULTY: 1,
      };

      const roleHierarchy = roleHierarchies[role.systemRole] || 0;
      if (actorHierarchy <= roleHierarchy) {
        return Middleware.sendError(
          'Cannot assign roles with equal or higher privilege',
          403
        );
      }
    }

    // Layer 4: For HOD, check department overlap
    if (context.user.systemRole === 'HOD' && departmentId) {
      const canManage = await canManageFacultyInDepartment(
        context.user,
        [departmentId],
        context.user.departmentsHead?.map((d) => d.id) || []
      );

      if (!canManage) {
        return Middleware.sendError(
          'Cannot assign role outside your department',
          403
        );
      }
    }

    // Create assignment
    const assignment = await prisma.roleAssignment.create({
      data: {
        userId,
        roleId,
        schoolId: context.schoolId,
        departmentId: departmentId || null,
      },
    });

    return Middleware.sendCreated(assignment);
  } catch (error) {
    console.error('Assign role error:', error);
    return Middleware.sendError('Internal server error', 500);
  }
});
*/

// ============================================================
// EXAMPLE 4: Admin Dashboard - Full Access
// ============================================================

/**
 * File: src/app/api/admin/statistics/route.ts
 * 
 * Requirements:
 * - Only ADMIN can access
 * - Full data access across all schools/departments
 * - Comprehensive statistics
 */

/*
import { NextRequest } from 'next/server';
import { withSystemRole, Middleware } from '@/lib/rbac/middleware';
import { prisma } from '@/lib/db';

export const GET = withSystemRole('ADMIN', 'SUPER_ADMIN')(
  async (request: NextRequest, context) => {
    try {
      const [
        totalUsers,
        totalDepartments,
        totalExams,
        totalMarks,
        averageMarks,
      ] = await Promise.all([
        prisma.user.count({ where: { schoolId: context.schoolId } }),
        prisma.department.count({ where: { schoolId: context.schoolId } }),
        prisma.exam.count({ where: { schoolId: context.schoolId } }),
        prisma.marks.count({ where: { schoolId: context.schoolId } }),
        prisma.marks.aggregate({
          where: { schoolId: context.schoolId },
          _avg: { marks: true },
        }),
      ]);

      return Middleware.sendSuccess({
        totalUsers,
        totalDepartments,
        totalExams,
        totalMarks,
        averageMarks: averageMarks._avg.marks || 0,
      });
    } catch (error) {
      console.error('Statistics error:', error);
      return Middleware.sendError('Internal server error', 500);
    }
  }
);
*/

// ============================================================
// EXAMPLE 5: Frontend - Permission Guard Component
// ============================================================

/**
 * Usage in React Components
 */

/*
import { PermissionGuard } from '@/components/permission-guard';
import { useSession } from '@/lib/client/hooks';

export function MarkApprovalButton({ markId }: { markId: string }) {
  const { user } = useSession();

  return (
    <PermissionGuard
      permission="marks.approve"
      departmentId={user?.departmentsHead?.[0]?.id}
    >
      <button onClick={() => approveMarks(markId)}>
        Approve Marks
      </button>
    </PermissionGuard>
  );
}

// This button only renders if user has 'marks.approve' permission
// AND has access to the specified department
*/

// ============================================================
// EXAMPLE 6: Menu Visibility in Sidebar
// ============================================================

/**
 * Usage in Sidebar Component
 */

/*
import { getMenuForUser, filterActions } from '@/lib/rbac/menu-visibility';
import { MARK_ACTIONS } from '@/lib/rbac/menu-visibility';
import { useSession } from '@/lib/client/hooks';

export function Sidebar() {
  const { user } = useSession();
  const [departmentId, setDepartmentId] = useState<string>();

  // Get menu items based on user role and departments
  const menuItems = getMenuForUser(user, departmentId);

  // Get available actions
  const availableActions = filterActions(MARK_ACTIONS, user, departmentId);

  return (
    <nav>
      {menuItems.map((item) => (
        <MenuItem key={item.id} item={item} />
      ))}
      
      <ActionBar>
        {availableActions.map((action) => (
          <ActionButton
            key={action.id}
            {...action}
            disabled={action.disabled}
            title={action.title}
          />
        ))}
      </ActionBar>
    </nav>
  );
}
*/

// ============================================================
// EXPORTS FOR REFERENCE
// ============================================================

export const EXAMPLES = {
  HOD_MARKS_APPROVAL: 'Example 1: HOD-Only Marks Approval',
  FACULTY_EXAMS: 'Example 2: Faculty Exam Management',
  PRIVILEGE_ESCALATION: 'Example 3: Prevent Privilege Escalation',
  ADMIN_DASHBOARD: 'Example 4: Admin Dashboard',
  FRONTEND_GUARD: 'Example 5: Frontend Permission Guard',
  MENU_VISIBILITY: 'Example 6: Menu Visibility',
};
