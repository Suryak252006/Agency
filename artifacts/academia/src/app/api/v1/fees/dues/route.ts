import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { PaginationSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { searchParams } = new URL(request.url);
    const { page, limit } = PaginationSchema.parse({
      page: searchParams.get('page') ?? 0,
      limit: searchParams.get('limit') ?? 50,
    });
    const gradeId = searchParams.get('gradeId') ?? undefined;
    const academicYearId = searchParams.get('academicYearId') ?? undefined;
    const overdue = searchParams.get('overdue');

    const where: Record<string, unknown> = {
      schoolId: user.schoolId,
      status: { in: ['PENDING', 'OVERDUE'] },
    };
    if (academicYearId) where.academicYearId = academicYearId;
    if (overdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = 'PENDING';
    }
    if (gradeId) {
      where.student = { currentGradeId: gradeId };
    }

    const [installments, total] = await Promise.all([
      tdb.feeInstallment.findMany({
        where,
        orderBy: { dueDate: 'asc' },
        skip: page * limit,
        take: limit,
        include: {
          student: { select: { id: true, name: true, rollNo: true, currentGradeId: true } },
          category: { select: { id: true, name: true } },
          academicYear: { select: { id: true, name: true } },
        },
      }),
      tdb.feeInstallment.count({ where }),
    ]);

    const totalDue = installments.reduce((sum, i) => sum + Number(i.amount), 0);

    return NextResponse.json(
      apiSuccess({ installments, total, totalDue, page, limit }, requestId)
    );
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/fees/dues');
  }
}
