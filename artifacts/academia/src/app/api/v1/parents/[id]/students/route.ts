import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { LinkStudentToParentSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { id: parentId } = await params;
    const body = await request.json();
    const data = LinkStudentToParentSchema.parse(body);

    const parent = await tdb.parent.findUnique({ where: { id: parentId } });
    if (!parent) {
      return apiError('NOT_FOUND', 'Parent not found', requestId, undefined, 404);
    }

    const existing = await tdb.parentStudent.findFirst({
      where: { parentId, studentId: data.studentId },
    });
    if (existing) {
      return apiError('CONFLICT', 'Student already linked to this parent', requestId, undefined, 409);
    }

    if (data.isPrimary) {
      await tdb.parentStudent.updateMany({
        where: { studentId: data.studentId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const link = await tdb.parentStudent.create({
      data: {
        parentId,
        studentId: data.studentId,
        relation: data.relation,
        isPrimary: data.isPrimary,
      },
    });

    return NextResponse.json(apiSuccess({ link }, requestId), { status: 201 });
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/v1/parents/[id]/students');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { id: parentId } = await params;
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return apiError('VALIDATION_ERROR', 'studentId query param required', requestId, undefined, 400);
    }

    await tdb.parentStudent.deleteMany({ where: { parentId, studentId } });

    return NextResponse.json(apiSuccess({ unlinked: true }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'DELETE /api/v1/parents/[id]/students');
  }
}
