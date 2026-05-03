import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { UpdateGradeSchema } from '@/schemas';

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

    const grade = await tdb.grade.findFirst({ where: { id } });
    if (!grade) {
      return apiError('NOT_FOUND', 'Grade not found', requestId, undefined, 404);
    }

    return NextResponse.json(apiSuccess({ grade }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/grades/[id]');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { id } = await params;
    const body = await request.json();
    const data = UpdateGradeSchema.parse(body);

    const existing = await tdb.grade.findFirst({ where: { id } });
    if (!existing) {
      return apiError('NOT_FOUND', 'Grade not found', requestId, undefined, 404);
    }

    const grade = await tdb.grade.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.level !== undefined ? { level: data.level } : {}),
        ...(data.order !== undefined ? { order: data.order } : {}),
      },
    });

    return NextResponse.json(apiSuccess({ grade }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'PATCH /api/v1/grades/[id]');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { id } = await params;

    const existing = await tdb.grade.findFirst({ where: { id } });
    if (!existing) {
      return apiError('NOT_FOUND', 'Grade not found', requestId, undefined, 404);
    }

    await tdb.grade.delete({ where: { id } });
    return NextResponse.json(apiSuccess({ deleted: true, id }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'DELETE /api/v1/grades/[id]');
  }
}
