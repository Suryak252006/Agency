import type { Request } from 'express';
import { APP_SESSION_COOKIE, type AppSessionRole, verifyAppSessionCookie } from './session-cookie.js';

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
  (error as any).code = code;
  return error;
}

export function homeForRole(role: AppRole): string {
  switch (role) {
    case 'admin': return '/admin';
    case 'faculty': return '/faculty';
    case 'parent': return '/parent';
    default: return '/auth/login';
  }
}

export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const rawCookie = req.cookies?.[APP_SESSION_COOKIE] as string | undefined;
  const appSession = await verifyAppSessionCookie(rawCookie ?? null);
  if (!appSession) return null;
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

export async function requireSessionUser(req: Request, options: SessionOptions = {}): Promise<SessionUser> {
  const user = await getSessionUser(req);
  if (!user) throw makeError('UNAUTHORIZED', 'Unauthorized');
  if (options.roles && !options.roles.includes(user.role)) throw makeError('FORBIDDEN', 'Forbidden');
  return user;
}
