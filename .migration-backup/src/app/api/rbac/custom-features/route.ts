// ============================================================
// API: Custom Features CRUD Routes
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAppSession } from '@/lib/supabase/middleware';

// GET /api/rbac/custom-features
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
    const module = searchParams.get('module');
    const search = searchParams.get('search');

    const where: any = { schoolId };

    if (status) {
      where.status = status;
    }

    if (module) {
      where.module = module;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { key: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [features, total] = await Promise.all([
      prisma.customFeature.findMany({
        where,
        include: { assignments: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customFeature.count({ where }),
    ]);

    const formatted = features.map((f) => ({
      ...f,
      assignmentCount: f.assignments.length,
    }));

    return NextResponse.json({
      items: formatted,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('GET /api/rbac/custom-features error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/rbac/custom-features
export async function POST(request: NextRequest) {
  try {
    const appSession = await getAppSession(request);
    if (!appSession?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission: custom_features.create
    const permission = await prisma.roleAssignment.findFirst({
      where: {
        userId: appSession.userId,
        role: {
          permissions: {
            some: {
              permission: { key: 'custom_features.create' },
            },
          },
        },
      },
    });

    if (!permission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, key, module, description, type, scope, status } =
      await request.json();

    const schoolId = appSession.schoolId;

    // Check duplicate key
    const existing = await prisma.customFeature.findUnique({
      where: { schoolId_key: { schoolId, key } },
    });

    if (existing) {
      return NextResponse.json({ error: 'Feature key already exists' }, { status: 400 });
    }

    // Create feature
    const feature = await prisma.customFeature.create({
      data: {
        schoolId,
        name,
        key,
        module,
        description,
        type,
        scope,
        status,
        createdBy: appSession.userId,
      },
    });

    // Audit log
    await prisma.rBACLog.create({
      data: {
        schoolId,
        actorId: appSession.userId,
        action: 'CUSTOM_FEATURE_CREATED',
        targetType: 'custom_feature',
        targetId: feature.id,
        metadata: { name, key, module },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    return NextResponse.json(feature, { status: 201 });
  } catch (error) {
    console.error('POST /api/rbac/custom-features error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
