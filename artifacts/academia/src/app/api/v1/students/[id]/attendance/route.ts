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
    const user = await requireSessionUser({ roles: ['admin', 'faculty'] });
    const tdb = tenantDb(user.schoolId);
    const { id: studentId } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') ?? undefined;
    const termId = searchParams.get('termId') ?? undefined;

    let dateFilter: { gte: Date; lte: Date } | undefined;
    if (month) {
      const [year, mon] = month.split('-').map(Number);
      dateFilter = { gte: new Date(year, mon - 1, 1), lte: new Date(year, mon, 0, 23, 59, 59) };
    }

    const records = await tdb.attendanceRecord.findMany({
      where: {
        studentId,
        session: {
          ...(dateFilter ? { date: dateFilter } : {}),
          ...(termId
            ? {
                academicYear: {
                  terms: { some: { id: termId } },
                },
              }
            : {}),
        },
      },
      include: {
        session: {
          select: {
            id: true,
            date: true,
            isFinalized: true,
            class: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { session: { date: 'desc' } },
      take: 200,
    });

    const total = records.length;
    const byStatus = records.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});
    const attendancePct = total > 0 ? ((byStatus.PRESENT ?? 0) / total) * 100 : null;

    return NextResponse.json(
      apiSuccess({ records, summary: { total, byStatus, attendancePct } }, requestId)
    );
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/students/[id]/attendance');
  }
}
