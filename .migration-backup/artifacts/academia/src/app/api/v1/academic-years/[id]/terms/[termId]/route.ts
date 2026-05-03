import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { UpdateTermSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; termId: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser();
    const tdb = tenantDb(user.schoolId);
    const { id: academicYearId, termId } = await params;

    const term = await tdb.term.findFirst({
      where: { id: termId, academicYearId },
    });

    if (!term) {
      return apiError('NOT_FOUND', 'Term not found', requestId, undefined, 404);
    }

    return NextResponse.json(apiSuccess({ term }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/academic-years/[id]/terms/[termId]');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; termId: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser('admin');
    const tdb = tenantDb(user.schoolId);
    const { id: academicYearId, termId } = await params;
    const body = await request.json();
    const data = UpdateTermSchema.parse(body);

    const existing = await tdb.term.findFirst({ where: { id: termId, academicYearId } });
    if (!existing) {
      return apiError('NOT_FOUND', 'Term not found', requestId, undefined, 404);
    }

    const term = await tdb.term.update({
      where: { id: termId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.examType !== undefined ? { examType: data.examType } : {}),
        ...(data.order !== undefined ? { order: data.order } : {}),
        ...(data.weightage !== undefined ? { weightage: data.weightage } : {}),
        ...(data.startDate !== undefined ? { startDate: data.startDate ? new Date(data.startDate) : null } : {}),
        ...(data.endDate !== undefined ? { endDate: data.endDate ? new Date(data.endDate) : null } : {}),
      },
    });

    return NextResponse.json(apiSuccess({ term }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'PATCH /api/v1/academic-years/[id]/terms/[termId]');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; termId: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser('admin');
    const tdb = tenantDb(user.schoolId);
    const { id: academicYearId, termId } = await params;

    const existing = await tdb.term.findFirst({ where: { id: termId, academicYearId } });
    if (!existing) {
      return apiError('NOT_FOUND', 'Term not found', requestId, undefined, 404);
    }
    if (existing.isPublished) {
      return apiError('PUBLISHED', 'Published terms cannot be deleted', requestId, undefined, 409);
    }

    await tdb.term.delete({ where: { id: termId } });
    return NextResponse.json(apiSuccess({ deleted: true, id: termId }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'DELETE /api/v1/academic-years/[id]/terms/[termId]');
  }
}
