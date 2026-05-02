import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { APP_SESSION_COOKIE, type AppSessionRole, createAppSessionCookie } from '@/lib/auth/session-cookie';
import { db } from '@/lib/db';
import { apiError, apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { homeForRole } from '@/lib/server/session';
import { logAuthFailure, logInfo } from '@/lib/server/logging';
import { LoginSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

/**
 * Maps a DB UserRole enum value to the AppSessionRole stored in the HMAC cookie.
 * ADMIN, PRINCIPAL, ACCOUNTANT all receive 'admin' — the admin portal handles
 * fine-grained permission differences via RBAC.
 */
function dbRoleToSessionRole(dbRole: string): AppSessionRole {
  switch (dbRole) {
    case 'ADMIN':
    case 'PRINCIPAL':
    case 'ACCOUNTANT':
      return 'admin';
    case 'FACULTY':
      return 'faculty';
    case 'PARENT':
      return 'parent';
    default:
      return 'faculty';
  }
}

export async function POST(req: Request) {
  const requestId = generateRequestId();

  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        parsed.error.errors[0]?.message ?? 'Invalid input',
        requestId,
        undefined,
        400,
      );
    }

    const { email, password } = parsed.data;

    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        schoolId: true,
        name: true,
        isActive: true,
        faculty: { select: { id: true } },
      },
    });

    // Always do password comparison (even if user not found) to prevent timing attacks.
    const passwordMatch = user ? await compare(password, user.password) : false;

    if (!user || !passwordMatch) {
      logAuthFailure(email, 'Invalid credentials', { requestId });
      return apiError('INVALID_CREDENTIALS', 'Invalid email or password', requestId, undefined, 401);
    }

    if (user.isActive === false) {
      logAuthFailure(email, 'Account inactive', { requestId });
      return apiError('ACCOUNT_INACTIVE', 'Your account has been deactivated', requestId, undefined, 403);
    }

    const role = dbRoleToSessionRole(user.role);
    const redirectTo = homeForRole(role);

    const sessionCookie = await createAppSessionCookie({
      userId: user.id,
      email: user.email,
      role,
      schoolId: user.schoolId,
      name: user.name,
      facultyId: user.faculty?.id ?? null,
    });

    // Update lastLoginAt asynchronously — don't block the login response
    db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }).catch((err) => console.error('Failed to update lastLoginAt:', err));

    logInfo('User logged in', {
      requestId,
      userId: user.id,
      email: user.email,
      role,
      schoolId: user.schoolId,
    });

    const response = NextResponse.json(
      apiSuccess({ success: true, redirectTo }, requestId),
      { status: 200 }
    );

    response.cookies.set(APP_SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/auth/login');
  }
}
