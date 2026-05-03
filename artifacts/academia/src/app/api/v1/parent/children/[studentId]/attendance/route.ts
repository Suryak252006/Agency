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
    const month = searchParams.get('month') ?? undefined;

    const parent = await tdb.parent.findFirst({
      where: { userId: user.id, schoolId: user.schoolId },
      include: { children: { where: { studentId }, select: { studentId: true } } },
    });
    if (!parent || parent.children.length === 0) {
      return apiError('FORBIDDEN', 'Student not linked to this parent', requestId, undefined, 403);
    }

    let dateFilter: Record<string, Date> | undefined;
    if (month) {
      const [year, mon] = month.split('-').map(Number);
      const start = new Date(year, mon - 1, 1);
      const end = new Date(year, mon, 0, 23, 59, 59);
      dateFilter = { gte: start, lte: end };
    }

    const records = await tdb.attendanceRecord.findMany({
      where: {
        studentId,
        session: {
          ...(dateFilter ? { date: dateFilter } : {}),
        },
      },
      include: {
        session: {
          select: {
            date: true,
            class: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { session: { date: 'desc' } },
      take: 100,
    });

    const summary = {
      total: records.length,
      present: records.filter((r) => r.status === 'PRESENT').length,
      absent: records.filter((r) => r.status === 'ABSENT').length,
      late: records.filter((r) => r.status === 'LATE').length,
      halfDay: records.filter((r) => r.status === 'HALF_DAY').length,
      medicalLeave: records.filter((r) => r.status === 'MEDICAL_LEAVE').length,
    };

    return NextResponse.json(apiSuccess({ records, summary }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/parent/children/[studentId]/attendance');
  }
}
