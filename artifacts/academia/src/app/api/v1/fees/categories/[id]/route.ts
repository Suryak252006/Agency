import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { UpdateFeeCategorySchema } from '@/schemas';

export const dynamic = 'force-dynamic';

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
    const data = UpdateFeeCategorySchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;

    const category = await tdb.feeCategory.update({ where: { id }, data: updateData });

    return NextResponse.json(apiSuccess({ category }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'PATCH /api/v1/fees/categories/[id]');
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

    const existing = await tdb.feeCategory.findUnique({
      where: { id },
      include: { _count: { select: { structures: true } } },
    });
    if (!existing) {
      return apiError('NOT_FOUND', 'Fee category not found', requestId, undefined, 404);
    }
    if ((existing as { _count: { structures: number } })._count.structures > 0) {
      return apiError('CONFLICT', 'Cannot delete category with existing fee structures', requestId, undefined, 409);
    }

    await tdb.feeCategory.delete({ where: { id } });

    return NextResponse.json(apiSuccess({ deleted: true }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'DELETE /api/v1/fees/categories/[id]');
  }
}
