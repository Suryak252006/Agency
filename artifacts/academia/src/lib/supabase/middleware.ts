import { type NextRequest, NextResponse } from 'next/server';
import { APP_SESSION_COOKIE, type AppSessionRole, verifyAppSessionCookie } from '@/lib/auth/session-cookie';
import { isAdminPortalRole } from '@/lib/server/session';
import type { IUserWithPermissions } from '@/types/rbac';

/**
 * Legacy AppSession type kept for backward compatibility with RBAC middleware callers.
 * New code should use getSessionUser() from @/lib/server/session instead.
 */
type AppSession = {
  userId: string;
  email: string;
  role: 'ADMIN' | 'FACULTY';
  schoolId: string;
  user?: IUserWithPermissions;
};

const PUBLIC_PATHS = ['/', '/auth/login'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname);
}

function homeForRole(role: AppSessionRole): string {
  if (isAdminPortalRole(role)) return '/admin';
  if (role === 'faculty') return '/faculty';
  if (role === 'parent') return '/parent';
  return '/auth/login';
}

/**
 * Returns the AppSession from the HMAC session cookie.
 * Used by the RBAC middleware layer. Maps all admin-portal roles → 'ADMIN'.
 */
export async function getAppSession(request: NextRequest): Promise<AppSession | null> {
  const claims = await verifyAppSessionCookie(request.cookies.get(APP_SESSION_COOKIE)?.value);

  if (!claims) {
    return null;
  }

  return {
    userId: claims.userId,
    email: claims.email,
    role: isAdminPortalRole(claims.role) ? 'ADMIN' : 'FACULTY',
    schoolId: claims.schoolId,
  };
}

/**
 * Called by src/middleware.ts for every non-API request.
 * Handles redirect logic for public paths, unauthenticated users, and portal mismatches.
 */
export async function updateSession(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;
  const claims = await verifyAppSessionCookie(request.cookies.get(APP_SESSION_COOKIE)?.value);

  // ── Public paths ───────────────────────────────────────────────────────────
  if (isPublicPath(pathname)) {
    if (claims !== null) {
      return NextResponse.redirect(new URL(homeForRole(claims.role), request.url));
    }
    return response;
  }

  // ── No session — redirect to login ────────────────────────────────────────
  if (!claims) {
    const loginUrl = new URL('/auth/login', request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.cookies.delete(APP_SESSION_COOKIE);
    return redirectResponse;
  }

  const role = claims.role;

  // ── Portal access guard ────────────────────────────────────────────────────
  if (pathname.startsWith('/admin') && !isAdminPortalRole(role)) {
    return NextResponse.redirect(new URL(homeForRole(role), request.url));
  }

  if (pathname.startsWith('/faculty') && role !== 'faculty') {
    return NextResponse.redirect(new URL(homeForRole(role), request.url));
  }

  if (pathname.startsWith('/parent') && role !== 'parent') {
    return NextResponse.redirect(new URL(homeForRole(role), request.url));
  }

  // ── Slide the cookie TTL on each request ──────────────────────────────────
  response.cookies.set(APP_SESSION_COOKIE, request.cookies.get(APP_SESSION_COOKIE)!.value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  return response;
}
