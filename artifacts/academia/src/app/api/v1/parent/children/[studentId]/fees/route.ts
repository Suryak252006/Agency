import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['parent'] });
    const tdb = tenantDb(user.schoolId);
    const { studentId } = await params;
    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId') ?? undefined;

    const parent = await tdb.parent.findFirst({
      where: { userId: user.id, schoolId: user.schoolId },
      include: { children: { where: { studentId }, select: { studentId: true } } },
    });
    if (!parent || parent.children.length === 0) {
      return apiError('FORBIDDEN', 'Student not linked to this parent', requestId, undefined, 403);
    }

    const installmentWhere: Record<string, unknown> = { studentId };
    if (academicYearId) installmentWhere.academicYearId = academicYearId;

    const [installments, collections, feeAccount] = await Promise.all([
      tdb.feeInstallment.findMany({
        where: installmentWhere,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { dueDate: 'asc' },
      }),
      tdb.feeCollection.findMany({
        where: { studentId, ...(academicYearId ? { academicYearId } : {}) },
        orderBy: { receiptDate: 'desc' },
        take: 20,
      }),
      tdb.studentFeeAccount.findFirst({
        where: { studentId, ...(academicYearId ? { academicYearId } : {}) },
      }),
    ]);

    return NextResponse.json(
      apiSuccess({ installments, collections, feeAccount }, requestId)
    );
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/parent/children/[studentId]/fees');
  }
}
