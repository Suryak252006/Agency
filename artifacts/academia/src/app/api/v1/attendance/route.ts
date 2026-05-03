import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { CreateAttendanceSessionSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser();
    const tdb = tenantDb(user.schoolId);
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId') ?? undefined;
    const date = searchParams.get('date') ?? undefined;
    const page = Number(searchParams.get('page') ?? 0);
    const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100);

    const where: Record<string, unknown> = { schoolId: user.schoolId };
    if (classId) where.classId = classId;
    if (date) where.date = new Date(date);

    const [sessions, total] = await Promise.all([
      tdb.attendanceSession.findMany({
        where,
        include: {
          class: { select: { id: true, name: true } },
          _count: { select: { records: true } },
        },
        orderBy: { date: 'desc' },
        skip: page * limit,
        take: limit,
      }),
      tdb.attendanceSession.count({ where }),
    ]);

    return NextResponse.json(apiSuccess({ sessions, total, page, limit }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/attendance');
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin', 'faculty'] });
    const tdb = tenantDb(user.schoolId);
    const body = await request.json();
    const data = CreateAttendanceSessionSchema.parse(body);

    const existing = await tdb.attendanceSession.findFirst({
      where: {
        classId: data.classId,
        date: new Date(data.date),
      },
    });

    if (existing) {
      return NextResponse.json(apiSuccess({ session: existing }, requestId));
    }

    const academicYearId = data.academicYearId;
    if (!academicYearId) {
      const currentYear = await tdb.academicYear.findFirst({
        where: { schoolId: user.schoolId, isCurrent: true },
      });
      if (!currentYear) {
        const fallbackYear = await tdb.academicYear.findFirst({
          where: { schoolId: user.schoolId },
          orderBy: { createdAt: 'desc' },
        });
        if (!fallbackYear) {
          return NextResponse.json(apiSuccess({ session: null, error: 'No academic year found' }, requestId), { status: 400 });
        }
        const session = await tdb.attendanceSession.create({
          data: {
            schoolId: user.schoolId,
            classId: data.classId,
            academicYearId: fallbackYear.id,
            date: new Date(data.date),
            markedBy: user.id,
          },
        });
        return NextResponse.json(apiSuccess({ session }, requestId), { status: 201 });
      }
      const session = await tdb.attendanceSession.create({
        data: {
          schoolId: user.schoolId,
          classId: data.classId,
          academicYearId: currentYear.id,
          date: new Date(data.date),
          markedBy: user.id,
        },
      });
      return NextResponse.json(apiSuccess({ session }, requestId), { status: 201 });
    }

    const session = await tdb.attendanceSession.create({
      data: {
        schoolId: user.schoolId,
        classId: data.classId,
        academicYearId,
        date: new Date(data.date),
        markedBy: user.id,
      },
    });

    return NextResponse.json(apiSuccess({ session }, requestId), { status: 201 });
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/v1/attendance');
  }
}
