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
export async function parseBody<T>(
  request: NextRequest,
  schema: ZodTypeAny
): Promise<{ success: true; data: z.infer<typeof schema> } | { success: false; error: any }> {
  try {
    const body = await request.json();
    const parsed = schema.parse(body);
    return { success: true, data: parsed };
  } catch (error: any) {
    logValidationError(request.nextUrl.pathname, error);
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: error.errors || error.message,
      },
    };
  }
}

/**
 * Handle API route errors uniformly
 */
export function handleApiError(
  error: any,
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

  if (error.code === 'VALIDATION_ERROR') {
    return apiError(
      'VALIDATION_ERROR',
      error.message,
      requestId,
      error.details,
      400
    );
  }

  if (error.code === 'UNAUTHORIZED') {
    return apiError('UNAUTHORIZED', 'Unauthorized access', requestId, undefined, 401);
  }

  if (error.code === 'FORBIDDEN') {
    return apiError('FORBIDDEN', 'Access forbidden', requestId, undefined, 403);
  }

  if (error.code === 'NOT_FOUND') {
    return apiError('NOT_FOUND', 'Resource not found', requestId, undefined, 404);
  }

  if (error.code === 'CONFLICT') {
    return apiError('CONFLICT', error.message, requestId, undefined, 409);
  }

  // Default to 500
  return apiError(
    'INTERNAL_ERROR',
    'An internal server error occurred',
    requestId,
    process.env.NODE_ENV === 'development' ? { error: error.message } : undefined,
    500
  );
}
