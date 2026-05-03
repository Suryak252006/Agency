import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId') ?? undefined;

    const where: Record<string, unknown> = { schoolId: user.schoolId };
    if (academicYearId) where.academicYearId = academicYearId;

    const [totalCollections, pendingInstallments, feeAccounts] = await Promise.all([
      tdb.feeCollection.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      }),
      tdb.feeInstallment.aggregate({
        where: { ...where, status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
      tdb.studentFeeAccount.aggregate({
        where,
        _sum: { totalAmount: true, totalPaid: true, totalDue: true, concession: true },
      }),
    ]);

    return NextResponse.json(
      apiSuccess({
        collected: {
          total: totalCollections._sum.amount ?? 0,
          count: totalCollections._count,
        },
        pending: {
          total: pendingInstallments._sum.amount ?? 0,
          count: pendingInstallments._count,
        },
        accounts: feeAccounts._sum,
      }, requestId)
    );
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/fees/summary');
  }
}
