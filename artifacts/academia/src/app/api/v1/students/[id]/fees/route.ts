import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { id: studentId } = await params;
    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId') ?? undefined;

    const instWhere: Record<string, unknown> = { studentId };
    const collWhere: Record<string, unknown> = { studentId };
    if (academicYearId) {
      instWhere.academicYearId = academicYearId;
      collWhere.academicYearId = academicYearId;
    }

    const [installments, collections, feeAccount] = await Promise.all([
      tdb.feeInstallment.findMany({
        where: instWhere,
        include: {
          category: { select: { id: true, name: true } },
          academicYear: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      tdb.feeCollection.findMany({
        where: collWhere,
        orderBy: { receiptDate: 'desc' },
      }),
      tdb.studentFeeAccount.findFirst({
        where: academicYearId ? { studentId, academicYearId } : { studentId },
        orderBy: { lastUpdatedAt: 'desc' },
      }),
    ]);

    return NextResponse.json(
      apiSuccess({ installments, collections, feeAccount }, requestId)
    );
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/students/[id]/fees');
  }
}
