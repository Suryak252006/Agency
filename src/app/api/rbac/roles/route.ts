// ============================================================
// API: Roles CRUD Routes
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { userHasAnyPermission } from '@/lib/rbac/utils';
import { ROLE_PERMISSION_MAP } from '@/lib/rbac/constants';
import { getAppSession } from '@/lib/supabase/middleware';

// GET /api/roles - List all roles
export async function GET(request: NextRequest) {
  try {
    const appSession = await getAppSession(request);
    if (!appSession?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schoolId = appSession.schoolId;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Build query
    const where: any = { schoolId };
    if (status !== null) {
      where.status = status === 'active' ? true : false;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch with pagination
    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where,
        include: {
          permissions: true,
          userAssignments: true,
          customFeatureAssignments: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.role.count({ where }),
    ]);

    const formattedRoles = roles.map((role) => ({
      ...role,
      userCount: role.userAssignments.length,
      permissionCount: role.permissions.length,
      featureCount: role.customFeatureAssignments.length,
    }));

    return NextResponse.json({
      items: formattedRoles,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('GET /api/roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/roles - Create new role
export async function POST(request: NextRequest) {
  try {
    const appSession = await getAppSession(request);
    if (!appSession?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const permissions = await prisma.roleAssignment.findMany({
      where: { userId: appSession.userId },
      include: { role: { include: { permissions: true } } },
    });

    const userPermissions = permissions.flatMap((ra) =>
      ra.role.permissions.map((rp) => rp.permissionId),
    );

    const canCreateRole = await prisma.permission.findFirst({
      where: { key: 'roles.create', id: { in: userPermissions } },
    });

    if (!canCreateRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, description, scope, cloneFromRoleId, permissionIds } =
      await request.json();

    const schoolId = appSession.schoolId;

    // Check for duplicate name
    const existingRole = await prisma.role.findUnique({
      where: { schoolId_name: { schoolId, name } },
    });

    if (existingRole) {
      return NextResponse.json({ error: 'Role name already exists' }, { status: 400 });
    }

    // Create role
    const newRole = await prisma.role.create({
      data: {
        schoolId,
        name,
        description,
        scope,
        status: true,
        createdBy: appSession.userId,
      },
    });

    // Assign permissions (clone or explicit)
    let finalPermissionIds = permissionIds || [];

    if (cloneFromRoleId) {
      const clonedRole = await prisma.role.findUnique({
        where: { id: cloneFromRoleId },
        include: { permissions: true },
      });
      if (clonedRole) {
        finalPermissionIds = clonedRole.permissions.map((rp) => rp.permissionId);
      }
    }

    if (finalPermissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: finalPermissionIds.map((permId: string) => ({
          roleId: newRole.id,
          permissionId: permId,
        })),
        skipDuplicates: true,
      });
    }

    // Log action
    await prisma.rBACLog.create({
      data: {
        schoolId,
        actorId: appSession.userId,
        action: 'ROLE_CREATED',
        targetType: 'role',
        targetId: newRole.id,
        metadata: { name, scope },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    return NextResponse.json(newRole, { status: 201 });
  } catch (error) {
    console.error('POST /api/roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
