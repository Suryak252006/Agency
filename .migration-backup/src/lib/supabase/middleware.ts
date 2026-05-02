import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { APP_SESSION_COOKIE, verifyAppSessionCookie } from '@/lib/auth/session-cookie';
import { supabasePublishableKey, supabaseUrl } from './config';
import type { IUserWithPermissions } from '@/types/rbac';

type AppSession = {
  userId: string;
  email: string;
  role: 'ADMIN' | 'FACULTY';
  schoolId: string;
  user?: IUserWithPermissions;
};

type SupabaseCookie = {
  name: string;
  value: string;
  options?: Parameters<NextResponse['cookies']['set']>[2];
};

const PUBLIC_PATHS = ['/', '/auth/login'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname);
}

function homeForRole(role: 'ADMIN' | 'FACULTY') {
  return role === 'ADMIN' ? '/admin' : '/faculty';
}

export async function getAppSession(request: NextRequest): Promise<AppSession | null> {
  const claims = await verifyAppSessionCookie(request.cookies.get(APP_SESSION_COOKIE)?.value);

  if (!claims) {
    return null;
  }

  return {
    userId: claims.userId,
    email: claims.email,
    role: claims.role === 'admin' ? 'ADMIN' : 'FACULTY',
    schoolId: claims.schoolId,
  };
}

export async function updateSession(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  let response = NextResponse.next();
  const pathname = request.nextUrl.pathname;
  const appSession: AppSession | null = await getAppSession(request);

  if (isPublicPath(pathname)) {
    if (appSession !== null) {
      return NextResponse.redirect(new URL(homeForRole(appSession.role), request.url));
    }
  }

  if (appSession) {
    if (pathname.startsWith('/admin') && appSession.role !== 'ADMIN') {
      return NextResponse.redirect(new URL(homeForRole(appSession.role), request.url));
    }

    if (pathname.startsWith('/faculty') && appSession.role !== 'FACULTY') {
      return NextResponse.redirect(new URL(homeForRole(appSession.role), request.url));
    }

    response.cookies.set(APP_SESSION_COOKIE, request.cookies.get(APP_SESSION_COOKIE)!.value, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: SupabaseCookie[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next();
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (!isPublicPath(pathname)) {
      const loginUrl = new URL('/auth/login', request.url);
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.cookies.delete(APP_SESSION_COOKIE);
      return redirectResponse;
    }

    response.cookies.delete(APP_SESSION_COOKIE);
    return response;
  }

  return response;
}
