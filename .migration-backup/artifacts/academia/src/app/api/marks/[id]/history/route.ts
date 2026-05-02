import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { db } from '@/lib/db';
import { tenantDb } from '@/lib/db-tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = generateRequestId();

  try {
    const user = await requireSessionUser();
    const tdb = tenantDb(user.schoolId);
    const resolvedParams = await params;

    const marks = await tdb.marks.findFirst({
      where: { id: resolvedParams.id },
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
            faculty: { select: { userId: true } },
          },
        },
      },
    });

    if (!marks) {
      return apiError('NOT_FOUND', 'Marks record not found', requestId, undefined, 404);
    }

    if (user.role === 'faculty' && marks.class.faculty.userId !== user.id) {
      throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' });
    }

    // marksHistory has no schoolId — scope via marksId (already verified ownership above)
    const history = await db.marksHistory.findMany({
      where: { marksId: resolvedParams.id },
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
