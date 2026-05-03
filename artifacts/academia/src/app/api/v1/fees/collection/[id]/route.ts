import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';

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

    const collection = await tdb.feeCollection.findUnique({
      where: { id },
      include: {
        installments: {
          include: { installment: true },
        },
      },
    });
    if (!collection) {
      return apiError('NOT_FOUND', 'Fee collection not found', requestId, undefined, 404);
    }

    return NextResponse.json(apiSuccess({ collection }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/fees/collection/[id]');
  }
}
