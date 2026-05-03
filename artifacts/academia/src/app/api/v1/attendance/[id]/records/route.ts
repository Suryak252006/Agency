import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { BulkAttendanceSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser();
    const tdb = tenantDb(user.schoolId);
    const { id: sessionId } = await params;

    const session = await tdb.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        records: {
          include: {
            student: { select: { id: true, name: true, rollNo: true } },
          },
          orderBy: { student: { name: 'asc' } },
        },
        class: { select: { id: true, name: true } },
      },
    });

    if (!session) {
      return apiError('NOT_FOUND', 'Attendance session not found', requestId, undefined, 404);
    }

    return NextResponse.json(apiSuccess({ session }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/attendance/[id]/records');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin', 'faculty'] });
    const tdb = tenantDb(user.schoolId);
    const { id: sessionId } = await params;
    const body = await request.json();
    const data = BulkAttendanceSchema.parse({ sessionId, ...body });

    const session = await tdb.attendanceSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      return apiError('NOT_FOUND', 'Attendance session not found', requestId, undefined, 404);
    }

    const upserts = data.records.map((rec) =>
      tdb.attendanceRecord.upsert({
        where: {
          sessionId_studentId: { sessionId, studentId: rec.studentId },
        },
        create: {
          sessionId,
          studentId: rec.studentId,
          status: rec.status,
          remark: rec.note ?? null,
        },
        update: {
          status: rec.status,
          remark: rec.note ?? null,
        },
      })
    );

    const records = await tdb.$transaction(upserts);

    await tdb.attendanceSession.update({
      where: { id: sessionId },
      data: { markedAt: new Date(), markedBy: user.id },
    });

    return NextResponse.json(apiSuccess({ records, count: records.length }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'PUT /api/v1/attendance/[id]/records');
  }
}
