import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { APP_SESSION_COOKIE, type AppSessionRole, verifyAppSessionCookie } from '@/lib/auth/session-cookie';

export type AppRole = AppSessionRole;

export interface SessionUser {
  id: string;
  authUserId: string;
  email: string;
  role: AppRole;
  schoolId: string;
  name: string;
  facultyId?: string | null;
}

type SessionOptions = {
  roles?: AppRole[];
};

function makeError(code: string, message: string) {
  const error = new Error(message);
  (error as Error & { code: string }).code = code;
  return error;
}

/**
 * Returns true if the session role grants access to the admin portal.
 * admin = DB role ADMIN
 * All three map to the same portal; RBAC handles fine-grained permissions.
 */
export function isAdminPortalRole(role: AppRole): boolean {
  return role === 'admin';
}

/**
 * Returns the home portal path for a given session role.
 */
export function homeForRole(role: AppRole): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'faculty':
      return '/faculty';
    case 'parent':
      return '/parent';
    default:
      return '/auth/login';
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const appSession = await verifyAppSessionCookie(cookieStore.get(APP_SESSION_COOKIE)?.value);

  if (!appSession) {
    return null;
  }

  return {
    id: appSession.userId,
    authUserId: appSession.userId,
    email: appSession.email,
    role: appSession.role,
    schoolId: appSession.schoolId,
    name: appSession.name,
    facultyId: appSession.facultyId ?? null,
  };
}

export async function requireSessionUser(options: SessionOptions = {}) {
  const user = await getSessionUser();

  if (!user) {
    throw makeError('UNAUTHORIZED', 'Unauthorized');
  }

  if (options.roles && !options.roles.includes(user.role)) {
    throw makeError('FORBIDDEN', 'Forbidden');
  }

  return user;
}

/**
 * For use in Server Components / page.tsx files.
 * Redirects to login if no session. Redirects to home portal if wrong role.
 *
 * @param portalRole  'admin' | 'faculty' | 'parent' — the portal being accessed.
 */
export async function requirePageSessionUser(portalRole?: 'admin' | 'faculty' | 'parent') {
  const user = await getSessionUser();

  if (!user) {
    redirect('/auth/login');
  }

  if (portalRole && user.role !== portalRole) {
    redirect(homeForRole(user.role));
  }

  return user;
}
