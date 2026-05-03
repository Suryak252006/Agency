import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { UpdateFeeStructureSchema } from '@/schemas';

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

    const structure = await tdb.feeStructure.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        grade: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
      },
    });
    if (!structure) {
      return apiError('NOT_FOUND', 'Fee structure not found', requestId, undefined, 404);
    }

    return NextResponse.json(apiSuccess({ structure }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/fees/structure/[id]');
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
    const data = UpdateFeeStructureSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.frequency !== undefined) updateData.frequency = data.frequency;
    if (data.dueDay !== undefined) updateData.dueDay = data.dueDay;
    if (data.isOptional !== undefined) updateData.isOptional = data.isOptional;

    const structure = await tdb.feeStructure.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true } },
        grade: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(apiSuccess({ structure }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'PATCH /api/v1/fees/structure/[id]');
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

    await tdb.feeStructure.delete({ where: { id } });

    return NextResponse.json(apiSuccess({ deleted: true }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'DELETE /api/v1/fees/structure/[id]');
  }
}
