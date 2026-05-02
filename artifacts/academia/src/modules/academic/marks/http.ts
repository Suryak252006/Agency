import { type NextRequest, NextResponse } from 'next/server';
import {
  apiError,
  apiSuccess,
  generateRequestId,
  handleApiError,
  parseBody,
} from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import {
  AcceptMarksSchema,
  BatchMarksStatusSchema,
  LockMarksSchema,
} from '@/schemas';
import { acceptMarks, lockMarks } from '@/lib/server/marks';

export async function handleLockMarks(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const parsed = await parseBody(request, LockMarksSchema);
    if (!parsed.success) {
      return apiError(parsed.error.code, parsed.error.message, requestId, parsed.error.details, 400);
    }

    const user = await requireSessionUser({ roles: ['faculty'] });
    const result = await lockMarks(parsed.data.examId, parsed.data.classId, user);
    return NextResponse.json(apiSuccess({ locked: result.count }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'POST marks lock');
  }
}

export async function handleAcceptMarks(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const parsed = await parseBody(request, AcceptMarksSchema);
    if (!parsed.success) {
      return apiError(parsed.error.code, parsed.error.message, requestId, parsed.error.details, 400);
    }

    const user = await requireSessionUser({ roles: ['admin'] });
    const result = await acceptMarks(parsed.data.marksIds, user);
    return NextResponse.json(apiSuccess({ accepted: result.count }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'POST marks accept');
  }
}

export async function handleBatchMarksStatus(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const parsed = await parseBody(request, BatchMarksStatusSchema);
    if (!parsed.success) {
      return apiError(parsed.error.code, parsed.error.message, requestId, parsed.error.details, 400);
    }

    const user = await requireSessionUser({ roles: ['admin'] });
    const result = await acceptMarks(parsed.data.marksIds, user);

    return NextResponse.json(
      apiSuccess({ status: 'ACCEPTED', affected: result.count }, requestId)
    );
  } catch (error) {
    return handleApiError(error, requestId, 'PATCH marks status');
  }
}
