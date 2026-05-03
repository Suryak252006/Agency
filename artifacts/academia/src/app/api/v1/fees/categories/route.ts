import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { CreateFeeCategorySchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);

    const categories = await tdb.feeCategory.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { structures: true } } },
    });

    return NextResponse.json(apiSuccess({ categories }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/fees/categories');
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const body = await request.json();
    const data = CreateFeeCategorySchema.parse(body);

    const category = await tdb.feeCategory.create({
      data: {
        schoolId: user.schoolId,
        name: data.name,
        code: data.code ?? null,
        isRecurring: data.isRecurring ?? true,
      },
    });

    return NextResponse.json(apiSuccess({ category }, requestId), { status: 201 });
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/v1/fees/categories');
  }
}
