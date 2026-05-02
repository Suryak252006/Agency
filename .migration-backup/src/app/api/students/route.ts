import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId') ?? undefined;
    const page = Number(searchParams.get('page') ?? 0);
    const limit = Math.min(Number(searchParams.get('limit') ?? 100), 250); // Cap at 250

    if (classId) {
      const where = {
        classId,
        class: {
          schoolId: user.schoolId,
          ...(user.role === 'faculty'
            ? {
                faculty: {
                  userId: user.id,
                },
              }
            : {}),
        },
      };

      const [classStudents, total] = await Promise.all([
        db.classStudent.findMany({
          where,
          include: {
            student: true,
          },
          orderBy: {
            student: {
              name: 'asc',
            },
          },
          skip: page * limit,
          take: limit,
        }),
        db.classStudent.count({ where }),
      ]);

      return NextResponse.json(apiSuccess({ students: classStudents.map((entry) => entry.student), total, page, limit }, requestId));
    }

    const where = { schoolId: user.schoolId };
    const [students, total] = await Promise.all([
      db.student.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: page * limit,
        take: limit,
      }),
      db.student.count({ where }),
    ]);

    return NextResponse.json(apiSuccess({ students, total, page, limit }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/students');
  }
}
