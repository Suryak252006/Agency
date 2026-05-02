/**
 * Structured logging for observability
 * Enable with LOG_LEVEL=debug or LOG_LEVEL=info
 */

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LEVELS[LOG_LEVEL as keyof typeof LEVELS] || LEVELS.info;

interface LogContext {
  requestId?: string;
  userId?: string;
  schoolId?: string;
  action?: string;
  endpoint?: string;
  durationMs?: number;
  statusCode?: number;
  [key: string]: any;
}

function formatLog(level: string, message: string, context: LogContext) {
  const timestamp = new Date().toISOString();
  return JSON.stringify({
    timestamp,
    level,
    message,
    ...context,
  });
}

export function logDebug(message: string, context?: LogContext) {
  if (currentLevel <= LEVELS.debug) {
    console.log(formatLog('DEBUG', message, context || {}));
  }
}

export function logInfo(message: string, context?: LogContext) {
  if (currentLevel <= LEVELS.info) {
    console.log(formatLog('INFO', message, context || {}));
  }
}

export function logWarn(message: string, context?: LogContext) {
  if (currentLevel <= LEVELS.warn) {
    console.warn(formatLog('WARN', message, context || {}));
  }
}

export function logError(message: string, error?: any, context?: LogContext) {
  if (currentLevel <= LEVELS.error) {
    console.error(
      formatLog('ERROR', message, {
        ...(context || {}),
        error: error?.message || String(error),
        stack: error?.stack,
      })
    );
  }
}

/**
 * Log authentication failures
 */
export function logAuthFailure(email: string, reason: string, context?: LogContext) {
  logWarn('Authentication failed', {
    email,
    reason,
    ...context,
  });
}

/**
 * Log forbidden access attempts
 */
export function logForbiddenAccess(userId: string, action: string, resource: string, context?: LogContext) {
  logWarn('Forbidden access attempt', {
    userId,
    action,
    resource,
    ...context,
  });
}

/**
 * Log slow database queries
 */
export function logSlowQuery(query: string, durationMs: number, threshold: number = 1000, context?: LogContext) {
  if (durationMs > threshold) {
    logWarn('Slow database query', {
      query,
      durationMs,
      threshold,
      ...context,
    });
  }
}

/**
 * Log API mutations
 */
export function logMutation(
  endpoint: string,
  method: string,
  success: boolean,
  durationMs: number,
  context?: LogContext
) {
  const level = success ? 'info' : 'warn';
  const message = success ? 'Mutation succeeded' : 'Mutation failed';

  if (level === 'info') {
    logInfo(message, {
      endpoint,
      method,
      durationMs,
      ...context,
    });
  } else {
    logWarn(message, {
      endpoint,
      method,
      durationMs,
      ...context,
    });
  }
}

/**
 * Log validation errors
 */
export function logValidationError(endpoint: string, error: any, context?: LogContext) {
  logWarn('Validation error', {
    endpoint,
    error: error?.message || String(error),
    ...context,
  });
}
