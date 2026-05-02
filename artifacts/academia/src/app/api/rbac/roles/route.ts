import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

// GET /api/rbac/roles — list roles for the authenticated user's school
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)));
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = { schoolId: user.schoolId };
    if (status !== null && status !== '') {
      where.status = status === 'active';
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Use _count instead of loading full relation arrays (avoids N+1 joins)
    const [roles, total] = await Promise.all([
      db.role.findMany({
        where,
        select: {
          id: true,
          schoolId: true,
          name: true,
          description: true,
          scope: true,
          status: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              permissions: true,
              userAssignments: true,
              customFeatureAssignments: true,
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.role.count({ where }),
    ]);

    const items = roles.map(({ _count, ...r }) => ({
      ...r,
      permissionCount: _count.permissions,
      userCount: _count.userAssignments,
      featureCount: _count.customFeatureAssignments,
    }));

    return NextResponse.json(
      apiSuccess({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }, requestId),
    );
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/rbac/roles');
  }
}

// POST /api/rbac/roles — create a new role
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });

    // Permission check: roles.create
    const canCreate = await db.roleAssignment.findFirst({
      where: {
        userId: user.id,
        schoolId: user.schoolId,
        role: { permissions: { some: { permission: { key: 'roles.create' } } } },
      },
    });
    if (!canCreate) {
      const err = Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' });
      throw err;
    }

    const { name, description, scope, cloneFromRoleId, permissionIds } = await request.json();

    const existing = await db.role.findUnique({
      where: { schoolId_name: { schoolId: user.schoolId, name } },
    });
    if (existing) {
      const err = Object.assign(new Error('Role name already exists'), { code: 'CONFLICT' });
      throw err;
    }

    const newRole = await db.role.create({
      data: { schoolId: user.schoolId, name, description, scope, status: true, createdBy: user.id },
    });

    let finalPermissionIds: string[] = permissionIds || [];
    if (cloneFromRoleId) {
      const source = await db.role.findUnique({
        where: { id: cloneFromRoleId },
        select: { permissions: { select: { permissionId: true } } },
      });
      if (source) finalPermissionIds = source.permissions.map((p) => p.permissionId);
    }

    if (finalPermissionIds.length > 0) {
      await db.rolePermission.createMany({
        data: finalPermissionIds.map((permId) => ({ roleId: newRole.id, permissionId: permId })),
        skipDuplicates: true,
      });
    }

    await db.rBACLog.create({
      data: {
        schoolId: user.schoolId,
        actorId: user.id,
        action: 'ROLE_CREATED',
        targetType: 'role',
        targetId: newRole.id,
        metadata: { name, scope },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    return NextResponse.json(apiSuccess({ role: newRole }, requestId), { status: 201 });
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/rbac/roles');
  }
}
