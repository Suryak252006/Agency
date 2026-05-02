import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  generateRequestId,
  apiSuccess,
  apiError,
  parseBody,
  handleApiError,
} from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { SaveMarkSchema, GetMarksQuerySchema } from '@/schemas';
import { assertClassAccess, saveMark } from '@/lib/server/marks';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marks
 * Fetch marks for an exam
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    const classId = searchParams.get('classId');

    const query = GetMarksQuerySchema.parse({ examId, classId });
    const user = await requireSessionUser();

    if (user.role === 'faculty') {
      if (!query.classId) {
        return apiError('VALIDATION_ERROR', 'Faculty queries require classId', requestId, undefined, 400);
      }
      await assertClassAccess(user, query.classId);
    }

    const marks = await db.marks.findMany({
      where: {
        schoolId: user.schoolId,
        examId: query.examId,
        ...(query.classId ? { classId: query.classId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      select: {
        id: true,
        examId: true,
        classId: true,
        studentId: true,
        value: true,
        status: true,
        lockedAt: true,
        acceptedAt: true,
        updatedAt: true,
        student: {
          select: { id: true, name: true, rollNo: true },
        },
      },
    });

    return new Response(
      JSON.stringify(apiSuccess({ marks }, requestId)),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return handleApiError(error, requestId, 'GET /api/marks');
  }
}

/**
 * POST /api/marks
 * Save a mark entry (creates or updates in SUBMITTED status)
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const parsed = await parseBody(request, SaveMarkSchema);

    if (!parsed.success) {
      return apiError(parsed.error.code, parsed.error.message, requestId, parsed.error.details, 400);
    }

    const { examId, classId, studentId, value } = parsed.data;
    const user = await requireSessionUser({ roles: ['faculty'] });
    const result = await saveMark(examId, classId, studentId, value, user);

    return new Response(
      JSON.stringify(apiSuccess({ marksId: result.id, status: result.status, syncedAt: new Date().toISOString() }, requestId)),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return handleApiError(error, requestId, 'POST /api/marks');
  }
}
