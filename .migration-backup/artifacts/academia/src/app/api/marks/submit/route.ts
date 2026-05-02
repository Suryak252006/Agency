import { NextResponse } from 'next/server';
import { handleRequestLock } from '@/modules/academic/marks/http';

// Legacy alias — use /api/marks/request-lock instead
export const dynamic = 'force-dynamic';
export const POST = handleRequestLock;

export function GET() {
  return new NextResponse(null, { status: 405, headers: { Allow: 'POST' } });
}
