import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { UpdateSubjectSchema } from '@/schemas';

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

    const subject = await tdb.subject.findFirst({
      where: { id },
      include: { department: { select: { id: true, name: true } } },
    });

    if (!subject) {
      return apiError('NOT_FOUND', 'Subject not found', requestId, undefined, 404);
    }

    return NextResponse.json(apiSuccess({ subject }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/subjects/[id]');
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
    const data = UpdateSubjectSchema.parse(body);

    const existing = await tdb.subject.findFirst({ where: { id } });
    if (!existing) {
      return apiError('NOT_FOUND', 'Subject not found', requestId, undefined, 404);
    }

    const subject = await tdb.subject.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.code !== undefined ? { code: data.code.toUpperCase() } : {}),
        ...(data.subjectType !== undefined ? { subjectType: data.subjectType } : {}),
        ...(data.departmentId !== undefined ? { departmentId: data.departmentId ?? null } : {}),
      },
      include: { department: { select: { id: true, name: true } } },
    });

    return NextResponse.json(apiSuccess({ subject }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'PATCH /api/v1/subjects/[id]');
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

    const existing = await tdb.subject.findFirst({ where: { id } });
    if (!existing) {
      return apiError('NOT_FOUND', 'Subject not found', requestId, undefined, 404);
    }

    await tdb.subject.delete({ where: { id } });
    return NextResponse.json(apiSuccess({ deleted: true, id }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'DELETE /api/v1/subjects/[id]');
  }
}
