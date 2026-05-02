import { NextRequest } from 'next/server';
import {
  generateRequestId,
  apiSuccess,
  apiError,
  parseBody,
  handleApiError,
} from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { SaveMarkSchema, GetMarksQuerySchema } from '@/schemas';
import { assertClassAccess, saveMark } from '@/lib/server/marks';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marks
 * Fetch marks filtered by examId, classId, and/or status.
 *
 * Faculty:  examId + classId are both required.
 * Admin:    all params are optional (browse across the whole school).
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requireSessionUser();
    const tdb = tenantDb(user.schoolId);
    const { searchParams } = new URL(request.url);

    const query = GetMarksQuerySchema.parse({
      examId: searchParams.get('examId') ?? undefined,
      classId: searchParams.get('classId') ?? undefined,
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    if (user.role === 'faculty') {
      if (!query.examId || !query.classId) {
        return apiError(
          'VALIDATION_ERROR',
          'Faculty queries require both examId and classId',
          requestId,
          undefined,
          400,
        );
      }
      await assertClassAccess(user, query.classId);
    }

    const page = query.page ?? 0;
    const limit = query.limit ?? 20;

    const where = {
      ...(query.examId ? { examId: query.examId } : {}),
      ...(query.classId ? { classId: query.classId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [marks, total] = await Promise.all([
      tdb.marks.findMany({
        where,
        select: {
          id: true,
          examId: true,
          classId: true,
          studentId: true,
          value: true,
          status: true,
          lockRequestedAt: true,
          lockedAt: true,
          lockedBy: true,
          updatedAt: true,
          student: { select: { id: true, name: true, rollNo: true } },
        },
        orderBy: [{ classId: 'asc' }, { studentId: 'asc' }],
        skip: page * limit,
        take: limit,
      }),
      tdb.marks.count({ where }),
    ]);

    return new Response(
      JSON.stringify(apiSuccess({ marks, total, page, limit }, requestId)),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    return handleApiError(error, requestId, 'GET /api/marks');
  }
}

/**
 * POST /api/marks
 * Faculty saves/updates a mark for a student (SUBMITTED status, editable until lock request)
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
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    return handleApiError(error, requestId, 'POST /api/marks');
  }
}
