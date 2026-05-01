import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = generateRequestId();

  try {
    const user = await requireSessionUser();
    const marks = await db.marks.findFirst({
      where: {
        id: params.id,
        schoolId: user.schoolId,
      },
      select: {
        id: true,
        examId: true,
        classId: true,
        studentId: true,
        status: true,
        value: true,
        class: {
          select: {
            id: true,
            name: true,
            facultyId: true,
            faculty: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!marks) {
      return NextResponse.json(apiSuccess({ marks: null, history: [] }, requestId));
    }

    if (user.role === 'faculty' && marks.class.faculty.userId !== user.id) {
      throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' });
    }

    const history = await db.marksHistory.findMany({
      where: { marksId: params.id },
      select: {
        id: true,
        value: true,
        status: true,
        changedBy: true,
        reason: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(apiSuccess({ marks, history }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/marks/[id]/history');
  }
}
