import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSessionUser } from '@/lib/server/session';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { tenantDb } from '@/lib/db-tenant';
import { CuidSchema } from '@/schemas';

const AssignFeatureSchema = z
  .object({
    featureId: CuidSchema,
    roleId: CuidSchema.optional(),
    userId: CuidSchema.optional(),
    departmentId: CuidSchema.optional(),
    startDate: z.string().datetime(),
    expiryDate: z.string().datetime().optional(),
    requiresAcceptance: z.boolean().default(false),
  })
  .refine((d) => d.roleId || d.userId, {
    message: 'Either roleId or userId must be provided',
    path: ['roleId'],
  });

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requireSessionUser();

    if (user.role !== 'admin') {
      return apiError('FORBIDDEN', 'Admin access required', requestId, undefined, 403);
    }

    const tdb = tenantDb(user.schoolId);
    const body = await request.json();
    const parsed = AssignFeatureSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        parsed.error.errors[0]?.message ?? 'Invalid input',
        requestId,
        undefined,
        400,
      );
    }

    const { featureId, roleId, userId, departmentId, startDate, expiryDate, requiresAcceptance } =
      parsed.data;

    // Verify the feature belongs to this school
    const feature = await tdb.customFeature.findFirst({
      where: { id: featureId },
      select: { id: true },
    });

    if (!feature) {
      return apiError('NOT_FOUND', 'Custom feature not found', requestId, undefined, 404);
    }

    const assignment = await tdb.customFeatureAssignment.create({
      data: {
        schoolId: user.schoolId,
        featureId,
        roleId: roleId ?? null,
        userId: userId ?? null,
        departmentId: departmentId ?? null,
        startDate: new Date(startDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        requiresAcceptance,
        assignedBy: user.id,
      },
      select: {
        id: true,
        schoolId: true,
        featureId: true,
        roleId: true,
        userId: true,
        departmentId: true,
        startDate: true,
        expiryDate: true,
        requiresAcceptance: true,
        assignedBy: true,
        createdAt: true,
      },
    });

    await tdb.rBACLog.create({
      data: {
        schoolId: user.schoolId,
        actorId: user.id,
        action: 'CUSTOM_FEATURE_ASSIGNED',
        targetType: 'assignment',
        targetId: assignment.id,
        metadata: {
          featureId,
          roleId: roleId ?? null,
          userId: userId ?? null,
          requiresAcceptance,
        },
        ipAddress: request.headers.get('x-forwarded-for') ?? 'unknown',
      },
    });

    return NextResponse.json(apiSuccess(assignment, requestId), { status: 201 });
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/rbac/custom-features/assign');
  }
}
