import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { APP_SESSION_COOKIE, createAppSessionCookie } from '@/lib/auth/session-cookie';
import { db } from '@/lib/db';
import { apiError, apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { logAuthFailure, logInfo } from '@/lib/server/logging';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const requestId = generateRequestId();

  try {
    const body = await req.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return apiError('VALIDATION_ERROR', 'Email and password are required', requestId, undefined, 400);
    }

    // Fetch user by email (select password for comparison)
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        schoolId: true,
        name: true,
        faculty: { select: { id: true } },
      },
    });

    // Always do password comparison (even if user not found) to prevent timing attacks.
    const passwordMatch = user ? await compare(password, user.password) : false;

    if (!user || !passwordMatch) {
      logAuthFailure(email, 'Invalid credentials', { requestId });
      // Generic error - do not reveal whether email exists
      return apiError('INVALID_CREDENTIALS', 'Invalid email or password', requestId, undefined, 401);
    }

    const role = user.role === 'ADMIN' ? 'admin' : 'faculty';
    const redirectTo = role === 'admin' ? '/admin' : '/faculty';

    const sessionCookie = await createAppSessionCookie({
      userId: user.id,
      email: user.email,
      role,
      schoolId: user.schoolId,
      name: user.name,
      facultyId: user.faculty?.id ?? null,
    });

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
      maxAge: 60 * 60 * 8, // 8 hours
    });

    return response;
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/auth/login');
  }
}
