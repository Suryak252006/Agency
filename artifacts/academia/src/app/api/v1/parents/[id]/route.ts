import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { UpdateParentSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { id } = await params;

    const parent = await tdb.parent.findUnique({
      where: { id },
      include: {
        children: {
          include: {
            student: { select: { id: true, name: true, rollNo: true, email: true } },
          },
        },
      },
    });

    if (!parent) {
      return apiError('NOT_FOUND', 'Parent not found', requestId, undefined, 404);
    }

    return NextResponse.json(apiSuccess({ parent }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/parents/[id]');
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
    const data = UpdateParentSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.fatherName !== undefined) updateData.fatherName = data.fatherName;
    if (data.motherName !== undefined) updateData.motherName = data.motherName;
    if (data.guardianName !== undefined) updateData.guardianName = data.guardianName;
    if (data.primaryPhone !== undefined) updateData.primaryPhone = data.primaryPhone;
    if (data.secondaryPhone !== undefined) updateData.secondaryPhone = data.secondaryPhone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.occupation !== undefined) updateData.occupation = data.occupation;
    if (data.address !== undefined) updateData.address = { street: data.address };

    const parent = await tdb.parent.update({ where: { id }, data: updateData });

    return NextResponse.json(apiSuccess({ parent }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'PATCH /api/v1/parents/[id]');
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

    await tdb.parent.delete({ where: { id } });

    return NextResponse.json(apiSuccess({ deleted: true }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'DELETE /api/v1/parents/[id]');
  }
}
