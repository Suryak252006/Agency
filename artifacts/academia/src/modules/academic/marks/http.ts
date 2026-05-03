import { type NextRequest, NextResponse } from 'next/server';
import {
  apiError,
  apiSuccess,
  generateRequestId,
  handleApiError,
  parseBody,
} from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { ApproveLockSchema, RejectLockSchema, RequestLockSchema } from '@/schemas';
import { approveLock, rejectLock, requestLock } from '@/lib/server/marks';

/**
 * Faculty: request a lock for all SUBMITTED marks in an exam+class.
 * SUBMITTED → LOCK_PENDING
 */
export async function handleRequestLock(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const parsed = await parseBody(request, RequestLockSchema);
    if (!parsed.success) {
      return apiError(parsed.error.code, parsed.error.message, requestId, parsed.error.details, 400);
    }
    const user = await requireSessionUser({ roles: ['faculty'] });
    const result = await requestLock(parsed.data.examId, parsed.data.classId, user);
    return NextResponse.json(apiSuccess({ lockPending: result.count }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'POST marks/request-lock');
  }
}

/**
 * Admin / HOD: approve a lock request.
 * LOCK_PENDING → LOCKED
 * HOD is department-scoped; Admin can approve all.
 */
export async function handleApproveLock(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const parsed = await parseBody(request, ApproveLockSchema);
    if (!parsed.success) {
      return apiError(parsed.error.code, parsed.error.message, requestId, parsed.error.details, 400);
    }
    const user = await requireSessionUser({ roles: ['admin', 'faculty'] });
    const result = await approveLock(parsed.data.marksIds, user);
    return NextResponse.json(apiSuccess({ locked: result.count }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'POST marks/approve-lock');
  }
}

/**
 * Admin / HOD: reject a lock request.
 * LOCK_PENDING → SUBMITTED (marks return to editable)
 * HOD is department-scoped; Admin can reject all.
 */
export async function handleRejectLock(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const parsed = await parseBody(request, RejectLockSchema);
    if (!parsed.success) {
      return apiError(parsed.error.code, parsed.error.message, requestId, parsed.error.details, 400);
    }
    const user = await requireSessionUser({ roles: ['admin', 'faculty'] });
    const result = await rejectLock(parsed.data.marksIds, parsed.data.reason, user);
    return NextResponse.json(apiSuccess({ returned: result.count }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'POST marks/reject-lock');
  }
}
