import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { db } from '@/lib/db';
import { assertClassAccess } from '@/lib/server/marks';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId') ?? undefined;
    const page = Number(searchParams.get('page') ?? 0);
    const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100); // Cap at 100

    if (user.role === 'faculty' && !classId) {
      return NextResponse.json(apiSuccess({ exams: [], total: 0, page, limit }, requestId));
    }

    if (classId) {
      await assertClassAccess(user, classId);
    }

    const where = {
      schoolId: user.schoolId,
      ...(classId ? { OR: [{ classId }, { classId: null }] } : {}),
    };

    const [exams, total] = await Promise.all([
      db.exam.findMany({
        where,
        include: { _count: { select: { marks: true } } },
        orderBy: { startDate: 'desc' },
        skip: page * limit,
        take: limit,
      }),
      db.exam.count({ where }),
    ]);

    return NextResponse.json(apiSuccess({ exams, total, page, limit }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/exams');
  }
}
