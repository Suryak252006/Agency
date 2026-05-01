import { type NextRequest, NextResponse } from 'next/server';
import { apiError, apiSuccess, generateRequestId, handleApiError, parseBody } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { lockMarks } from '@/lib/server/marks';
import { LockMarksSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const parsed = await parseBody(request, LockMarksSchema);
    if (!parsed.success) {
      return apiError(parsed.error.code, parsed.error.message, requestId, parsed.error.details, 400);
    }

    const user = await requireSessionUser({ roles: ['admin'] });
    const result = await lockMarks(parsed.data.marksIds, user);
    return NextResponse.json(apiSuccess({ locked: result.count }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/marks/lock');
  }
}
