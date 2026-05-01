import { db } from '@/lib/db';
import type { RequestStatus, RequestType } from '@/schemas';
import type { SessionUser } from '@/lib/server/session';
import { createAuditLog } from './marks';

function makeError(code: string, message: string) {
  const error = new Error(message);
  (error as Error & { code: string }).code = code;
  return error;
}

export async function createRequest(
  user: SessionUser,
  type: RequestType,
  reason: string,
  marksId?: string
) {
  if (marksId) {
    const marks = await db.marks.findFirst({
      where: {
        id: marksId,
        schoolId: user.schoolId,
      },
      include: {
        class: {
          include: {
            faculty: true,
          },
        },
      },
    });

    if (!marks) {
      throw makeError('NOT_FOUND', 'Referenced marks entry was not found');
    }

    if (user.role === 'faculty' && marks.class.faculty.userId !== user.id) {
      throw makeError('FORBIDDEN', 'You can only request changes for your assigned classes');
    }

    // EDIT_MARKS requests can only be for locked marks
    if (type === 'EDIT_MARKS' && marks.status !== 'LOCKED') {
      throw makeError(
        'CONFLICT',
        `Cannot request edits for marks in ${marks.status} status. Edits are only for LOCKED marks.`
      );
    }
  }

  const request = await db.request.create({
    data: {
      userId: user.id,
      schoolId: user.schoolId,
      type,
      reason,
      marksId,
      status: 'PENDING',
    },
  });

  await createAuditLog(user.id, user.schoolId, 'REQUEST_CREATED', 'request', request.id, {
    type,
    reason,
    marksId,
  });

  return request;
}

export async function getRequests(
  user: SessionUser,
  status?: RequestStatus,
  type?: RequestType,
  limit: number = 20,
  offset: number = 0
) {
  // Cap limit to prevent DDoS
  const cappedLimit = Math.min(limit, 100);
  
  const where = {
    schoolId: user.schoolId,
    ...(user.role === 'faculty' ? { userId: user.id } : {}),
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
  };

  const [requests, total] = await Promise.all([
    db.request.findMany({
      where,
      select: {
        id: true,
        userId: true,
        type: true,
        status: true,
        reason: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: cappedLimit,
      skip: offset,
    }),
    db.request.count({ where }),
  ]);

  return { requests, total, limit: cappedLimit, offset };
}

export async function approveRequest(
  requestId: string,
  user: SessionUser,
  response?: string
) {
  const request = await db.request.findFirst({
    where: {
      id: requestId,
      schoolId: user.schoolId,
    },
  });

  if (!request) {
    throw makeError('NOT_FOUND', 'Request not found');
  }

  if (request.status !== 'PENDING') {
    throw makeError('CONFLICT', `Request is already ${request.status}`);
  }

  const updated = await db.request.update({
    where: { id: requestId },
    data: {
      status: 'APPROVED',
      respondedBy: user.id,
      response,
    },
  });

  await createAuditLog(user.id, user.schoolId, 'REQUEST_APPROVED', 'request', requestId, {
    type: request.type,
    response,
  });

  return updated;
}

export async function rejectRequest(
  requestId: string,
  user: SessionUser,
  response: string
) {
  const request = await db.request.findFirst({
    where: {
      id: requestId,
      schoolId: user.schoolId,
    },
  });

  if (!request) {
    throw makeError('NOT_FOUND', 'Request not found');
  }

  if (request.status !== 'PENDING') {
    throw makeError('CONFLICT', `Request is already ${request.status}`);
  }

  const updated = await db.request.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      respondedBy: user.id,
      response,
    },
  });

  await createAuditLog(user.id, user.schoolId, 'REQUEST_REJECTED', 'request', requestId, {
    type: request.type,
    response,
  });

  return updated;
}
