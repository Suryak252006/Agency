import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';

export const dynamic = 'force-dynamic';

// GET /api/rbac/roles — list roles for the authenticated user's school
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)));
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    if (status !== null && status !== '') {
      where.status = status === 'active';
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [roles, total] = await Promise.all([
      tdb.role.findMany({
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
      tdb.role.count({ where }),
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
    const tdb = tenantDb(user.schoolId);

    // Permission check: roles.create — scoped to this tenant via tdb
    const canCreate = await tdb.roleAssignment.findFirst({
      where: {
        userId: user.id,
        role: { permissions: { some: { permission: { key: 'roles.create' } } } },
      },
    });
    if (!canCreate) {
      throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' });
    }

    const { name, description, scope, cloneFromRoleId, permissionIds } = await request.json();

    // findFirst so tenantDb injects schoolId — (schoolId, name) is effectively unique
    const existing = await tdb.role.findFirst({ where: { name } });
    if (existing) {
      throw Object.assign(new Error('Role name already exists'), { code: 'CONFLICT' });
    }

    const newRole = await tdb.role.create({
      data: { schoolId: user.schoolId, name, description, scope, status: true, createdBy: user.id },
    });

    let finalPermissionIds: string[] = permissionIds || [];
    if (cloneFromRoleId) {
      // Source role lookup is by id only — use db directly (findUnique)
      const source = await db.role.findUnique({
        where: { id: cloneFromRoleId },
        select: { permissions: { select: { permissionId: true } } },
      });
      if (source) finalPermissionIds = source.permissions.map((p) => p.permissionId);
    }

    if (finalPermissionIds.length > 0) {
      // rolePermission has no schoolId — use db directly
      await db.rolePermission.createMany({
        data: finalPermissionIds.map((permId) => ({ roleId: newRole.id, permissionId: permId })),
        skipDuplicates: true,
      });
    }

    await tdb.rBACLog.create({
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
