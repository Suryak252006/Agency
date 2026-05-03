import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason: string = body.reason ?? 'Voided by admin';

    const existing = await tdb.feeCollection.findUnique({
      where: { id },
      include: { installments: true },
    });
    if (!existing) {
      return apiError('NOT_FOUND', 'Fee collection not found', requestId, undefined, 404);
    }
    if (existing.voidedAt) {
      return apiError('CONFLICT', 'Fee collection already voided', requestId, undefined, 409);
    }

    const installmentIds = existing.installments.map((i) => i.installmentId);

    const [collection] = await tdb.$transaction([
      tdb.feeCollection.update({
        where: { id },
        data: { voidedAt: new Date(), voidedBy: user.id, voidReason: reason },
      }),
      ...(installmentIds.length > 0
        ? [tdb.feeInstallment.updateMany({
            where: { id: { in: installmentIds } },
            data: { status: 'PENDING', paidAt: null, paidAmount: null },
          })]
        : []),
    ]);

    return NextResponse.json(apiSuccess({ collection }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/v1/fees/collection/[id]/void');
  }
}
