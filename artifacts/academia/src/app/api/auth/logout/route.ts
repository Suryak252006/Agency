import { NextResponse } from 'next/server';
import { APP_SESSION_COOKIE } from '@/lib/auth/session-cookie';
import { apiSuccess, generateRequestId } from '@/lib/server/api';

export const dynamic = 'force-dynamic';

export async function POST() {
  const requestId = generateRequestId();
  const response = NextResponse.json(apiSuccess({ loggedOut: true }, requestId));
  response.cookies.delete(APP_SESSION_COOKIE);
  return response;
}
