import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

// GET /api/rbac/custom-features
// Admin: all custom features for the school.
// Faculty: only features directly assigned to them (scoped by active assignments).
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)));
    const status = searchParams.get('status');
    const module = searchParams.get('module');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = { schoolId: user.schoolId };
    if (status !== null && status !== '') {
      where.status = status;
    }
    if (module !== null && module !== '') {
      where.module = module;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { key: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Faculty only see features assigned to them (with non-expired assignments)
    if (user.role === 'faculty') {
      where.assignments = {
        some: {
          userId: user.id,
          OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }],
        },
      };
    }

    // Use _count instead of loading full assignments array (avoids N+1 join)
    const [features, total] = await Promise.all([
      db.customFeature.findMany({
        where,
        select: {
          id: true,
          schoolId: true,
          name: true,
          key: true,
          module: true,
          description: true,
          type: true,
          scope: true,
          status: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { assignments: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.customFeature.count({ where }),
    ]);

    const items = features.map(({ _count, ...f }) => ({
      ...f,
      assignmentCount: _count.assignments,
    }));

    return NextResponse.json(
      apiSuccess({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }, requestId),
    );
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/rbac/custom-features');
  }
}

// POST /api/rbac/custom-features — create a new custom feature
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });

    // Permission check: custom_features.create
    const canCreate = await db.roleAssignment.findFirst({
      where: {
        userId: user.id,
        role: {
          permissions: {
            some: { permission: { key: 'custom_features.create' } },
          },
        },
      },
    });
    if (!canCreate) {
      const err = Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' });
      throw err;
    }

    const { name, key, module, description, type, scope, status } = await request.json();

    const existing = await db.customFeature.findUnique({
      where: { schoolId_key: { schoolId: user.schoolId, key } },
    });
    if (existing) {
      const err = Object.assign(new Error('Feature key already exists'), { code: 'CONFLICT' });
      throw err;
    }

    const feature = await db.customFeature.create({
      data: {
        schoolId: user.schoolId,
        name,
        key,
        module,
        description,
        type,
        scope,
        status,
        createdBy: user.id,
      },
    });

    await db.rBACLog.create({
      data: {
        schoolId: user.schoolId,
        actorId: user.id,
        action: 'CUSTOM_FEATURE_CREATED',
        targetType: 'custom_feature',
        targetId: feature.id,
        metadata: { name, key, module },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    return NextResponse.json(apiSuccess({ feature }, requestId), { status: 201 });
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/rbac/custom-features');
  }
}
