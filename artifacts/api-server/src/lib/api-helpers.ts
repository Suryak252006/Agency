import type { Response } from 'express';
import { ZodError } from 'zod';

export interface ApiSuccessResponse<T> {
  data: T;
  timestamp: string;
  requestId: string;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId: string;
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function apiSuccess<T>(data: T, requestId: string): ApiSuccessResponse<T> {
  return { data, timestamp: new Date().toISOString(), requestId };
}

export function sendApiError(
  res: Response,
  code: string,
  message: string,
  requestId: string,
  details?: Record<string, any>,
  statusCode = 400
): void {
  res.status(statusCode).json({
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
    requestId,
  } satisfies ApiErrorResponse);
}

export function handleApiError(res: Response, error: unknown, requestId: string, endpoint: string): void {
  if (error instanceof ZodError) {
    sendApiError(res, 'VALIDATION_ERROR', 'Validation failed', requestId, { issues: error.errors }, 400);
    return;
  }
  const err = error as any;
  // Prisma unique constraint violation → 409 Conflict
  if (err?.code === 'P2002') {
    sendApiError(res, 'CONFLICT', 'A record with that value already exists', requestId, undefined, 409);
    return;
  }
  const code: string = err?.code ?? 'INTERNAL_ERROR';
  switch (code) {
    case 'UNAUTHORIZED':
      sendApiError(res, code, err.message ?? 'Unauthorized', requestId, undefined, 401);
      break;
    case 'FORBIDDEN':
      sendApiError(res, code, err.message ?? 'Forbidden', requestId, undefined, 403);
      break;
    case 'NOT_FOUND':
      sendApiError(res, code, err.message ?? 'Not found', requestId, undefined, 404);
      break;
    case 'CONFLICT':
    case 'LOCKED':
    case 'ALREADY_LOCKED':
    case 'PUBLISHED':
      sendApiError(res, code, err.message ?? 'Conflict', requestId, undefined, 409);
      break;
    default:
      console.error(`[${endpoint}]`, error);
      sendApiError(res, 'INTERNAL_ERROR', 'Internal server error', requestId, undefined, 500);
  }
}
