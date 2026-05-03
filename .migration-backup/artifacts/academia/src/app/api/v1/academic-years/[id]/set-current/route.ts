import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { id } = await params;

    const existing = await tdb.academicYear.findFirst({ where: { id } });
    if (!existing) {
      return apiError('NOT_FOUND', 'Academic year not found', requestId, undefined, 404);
    }

    // Atomic swap: clear isCurrent on all, set on target
    const [, academicYear] = await prisma.$transaction([
      prisma.academicYear.updateMany({
        where: { schoolId: user.schoolId, isCurrent: true },
        data: { isCurrent: false },
      }),
      prisma.academicYear.update({
        where: { id },
        data: { isCurrent: true },
      }),
    ]);

    return NextResponse.json(apiSuccess({ academicYear }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/v1/academic-years/[id]/set-current');
  }
}
