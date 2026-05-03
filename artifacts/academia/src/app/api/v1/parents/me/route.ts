import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['parent'] });
    const tdb = tenantDb(user.schoolId);

    const parent = await tdb.parent.findFirst({
      where: { userId: user.id, schoolId: user.schoolId },
      include: {
        children: {
          include: {
            student: {
              select: { id: true, name: true, rollNo: true, currentGradeId: true, isActive: true },
            },
          },
        },
      },
    });

    if (!parent) {
      return apiError('NOT_FOUND', 'Parent profile not found', requestId, undefined, 404);
    }

    return NextResponse.json(apiSuccess({ parent }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/parents/me');
  }
}
