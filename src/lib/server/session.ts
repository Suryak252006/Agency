import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { APP_SESSION_COOKIE, verifyAppSessionCookie } from '@/lib/auth/session-cookie';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';

export type AppRole = 'admin' | 'faculty';

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

function toAppRole(role: 'ADMIN' | 'FACULTY'): AppRole {
  return role === 'ADMIN' ? 'admin' : 'faculty';
}

async function buildSessionUser(authUserId: string, email: string): Promise<SessionUser | null> {
  const user = await db.user.findUnique({
    where: { email },
    include: {
      faculty: {
        select: { id: true },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    authUserId,
    email: user.email,
    role: toAppRole(user.role),
    schoolId: user.schoolId,
    name: user.name,
    facultyId: user.faculty?.id ?? null,
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const appSession = await verifyAppSessionCookie(cookies().get(APP_SESSION_COOKIE)?.value);

  if (appSession) {
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

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return null;
  }

  return buildSessionUser(user.id, user.email);
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

export async function requirePageSessionUser(role?: AppRole) {
  const user = await getSessionUser();

  if (!user) {
    redirect('/auth/login');
  }

  if (role && user.role !== role) {
    redirect(user.role === 'admin' ? '/admin' : '/faculty');
  }

  return user;
}
