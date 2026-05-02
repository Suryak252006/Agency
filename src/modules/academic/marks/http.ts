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
  ApproveMarksSchema,
  BatchMarksStatusSchema,
  LockMarksSchema,
  SubmitMarksSchema,
} from '@/schemas';
import { approveMarks, lockMarks, submitMarks } from '@/lib/server/marks';

export async function handleSubmitMarks(request: NextRequest) {
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
    return handleApiError(error, requestId, 'POST marks submissions');
  }
}

export async function handleApproveMarks(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const parsed = await parseBody(request, ApproveMarksSchema);
    if (!parsed.success) {
      return apiError(parsed.error.code, parsed.error.message, requestId, parsed.error.details, 400);
    }

    const user = await requireSessionUser({ roles: ['admin'] });
    const result = await approveMarks(parsed.data.marksIds, user);
    return NextResponse.json(apiSuccess({ approved: result.count }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'POST marks approve');
  }
}

export async function handleLockMarks(request: NextRequest) {
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
    return handleApiError(error, requestId, 'POST marks lock');
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
    const result =
      parsed.data.status === 'APPROVED'
        ? await approveMarks(parsed.data.marksIds, user)
        : await lockMarks(parsed.data.marksIds, user);

    return NextResponse.json(
      apiSuccess({ status: parsed.data.status, affected: result.count }, requestId)
    );
  } catch (error) {
    return handleApiError(error, requestId, 'PATCH marks status');
  }
}
