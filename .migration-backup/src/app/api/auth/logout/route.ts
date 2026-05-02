import { type NextRequest, NextResponse } from 'next/server';
import { APP_SESSION_COOKIE } from '@/lib/auth/session-cookie';
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/server';
import { apiSuccess, copyResponseCookies, generateRequestId, handleApiError } from '@/lib/server/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const authResponse = NextResponse.next();

  try {
    const supabase = createRouteHandlerSupabaseClient(request, authResponse);
    await supabase.auth.signOut();

    const response = NextResponse.json(apiSuccess({ loggedOut: true }, requestId));
    copyResponseCookies(authResponse, response);
    response.cookies.delete(APP_SESSION_COOKIE);
    return response;
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/auth/logout');
  }
}
