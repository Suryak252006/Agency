import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { UpdateAcademicYearSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser();
    const tdb = tenantDb(user.schoolId);
    const { id } = await params;

    const academicYear = await tdb.academicYear.findFirst({
      where: { id },
      include: { terms: { orderBy: { order: 'asc' } } },
    });

    if (!academicYear) {
      return apiError('NOT_FOUND', 'Academic year not found', requestId, undefined, 404);
    }

    return NextResponse.json(apiSuccess({ academicYear }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/academic-years/[id]');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser('admin');
    const tdb = tenantDb(user.schoolId);
    const { id } = await params;
    const body = await request.json();
    const data = UpdateAcademicYearSchema.parse(body);

    const existing = await tdb.academicYear.findFirst({ where: { id } });
    if (!existing) {
      return apiError('NOT_FOUND', 'Academic year not found', requestId, undefined, 404);
    }
    if (existing.isLocked) {
      return apiError('LOCKED', 'Academic year is locked and cannot be modified', requestId, undefined, 409);
    }

    const academicYear = await tdb.academicYear.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
        ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
      },
    });

    return NextResponse.json(apiSuccess({ academicYear }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'PATCH /api/v1/academic-years/[id]');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser('admin');
    const tdb = tenantDb(user.schoolId);
    const { id } = await params;

    const existing = await tdb.academicYear.findFirst({ where: { id } });
    if (!existing) {
      return apiError('NOT_FOUND', 'Academic year not found', requestId, undefined, 404);
    }
    if (existing.isLocked) {
      return apiError('LOCKED', 'Academic year is locked and cannot be deleted', requestId, undefined, 409);
    }

    await tdb.academicYear.delete({ where: { id } });
    return NextResponse.json(apiSuccess({ deleted: true, id }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'DELETE /api/v1/academic-years/[id]');
  }
}
