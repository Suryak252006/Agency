import { type ZodTypeAny, type z } from 'zod';
import { type NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logError, logWarn, logValidationError } from './logging';

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

/**
 * Generate a unique request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Create a successful API response
 */
export function apiSuccess<T>(
  data: T,
  requestId: string
): ApiSuccessResponse<T> {
  return {
    data,
    timestamp: new Date().toISOString(),
    requestId,
  };
}

/**
 * Create an error API response
 */
export function apiError(
  code: string,
  message: string,
  requestId: string,
  details?: Record<string, any>,
  statusCode: number = 400
): NextResponse<ApiErrorResponse> {
  const isClientError = statusCode >= 400 && statusCode < 500;

  if (isClientError) {
    logWarn(message, {
      requestId,
      code,
      statusCode,
      details,
    });
  }

  return NextResponse.json(
    {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId,
    },
    { status: statusCode }
  );
}

export function copyResponseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

/**
 * Parse and validate request body with Zod
 */
export interface ParseBodyError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export async function parseBody<T>(
  request: NextRequest,
  schema: ZodTypeAny
): Promise<{ success: true; data: z.infer<typeof schema> } | { success: false; error: ParseBodyError }> {
  try {
    const body = await request.json();
    const parsed = schema.parse(body);
    return { success: true, data: parsed };
  } catch (error: unknown) {
    logValidationError(request.nextUrl.pathname, error);
    const details: Record<string, unknown> | undefined =
      error instanceof ZodError
        ? { errors: error.errors }
        : error instanceof Error
        ? { message: error.message }
        : undefined;
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details,
      },
    };
  }
}

/**
 * Handle API route errors uniformly
 */
export function handleApiError(
  error: unknown,
  requestId: string,
  context?: string
) {
  logError(`API Error in ${context}`, error, { requestId });

  if (error instanceof ZodError) {
    return apiError(
      'VALIDATION_ERROR',
      'Invalid request parameters',
      requestId,
      { issues: error.issues },
      400
    );
  }

  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>;

    if (e['code'] === 'VALIDATION_ERROR') {
      return apiError(
        'VALIDATION_ERROR',
        String(e['message'] ?? 'Validation error'),
        requestId,
        typeof e['details'] === 'object' && e['details'] !== null
          ? (e['details'] as Record<string, unknown>)
          : undefined,
        400
      );
    }

    if (e['code'] === 'UNAUTHORIZED') {
      return apiError('UNAUTHORIZED', 'Unauthorized access', requestId, undefined, 401);
    }

    if (e['code'] === 'FORBIDDEN') {
      return apiError('FORBIDDEN', 'Access forbidden', requestId, undefined, 403);
    }

    if (e['code'] === 'NOT_FOUND') {
      return apiError('NOT_FOUND', 'Resource not found', requestId, undefined, 404);
    }

    if (e['code'] === 'CONFLICT') {
      return apiError('CONFLICT', String(e['message'] ?? 'Conflict'), requestId, undefined, 409);
    }

    // Prisma unique constraint violation → 409
    if (e['code'] === 'P2002') {
      return apiError('CONFLICT', 'A record with this value already exists', requestId, undefined, 409);
    }
  }

  const msg = error instanceof Error ? error.message : undefined;
  return apiError(
    'INTERNAL_ERROR',
    'An internal server error occurred',
    requestId,
    process.env.NODE_ENV === 'development' ? { error: msg } : undefined,
    500
  );
}
