import { type NextRequest, NextResponse } from 'next/server';
import { apiError, apiSuccess, generateRequestId, handleApiError, parseBody } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { submitMarks } from '@/lib/server/marks';
import { SubmitMarksSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const parsed = await parseBody(request, SubmitMarksSchema);
    if (!parsed.success) {
      return apiError(parsed.error.code, parsed.error.message, requestId, parsed.error.details, 400);
    }

    const user = await requireSessionUser({ roles: ['faculty'] });
    const result = await submitMarks(parsed.data.examId, parsed.data.classId, user);

    return NextResponse.json(apiSuccess({ submitted: result.count }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/marks/submit');
  }
}
