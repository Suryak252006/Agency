import { NextResponse } from 'next/server';
import { handleApproveLock } from '@/modules/academic/marks/http';

// Legacy alias — use /api/marks/approve-lock instead
export const dynamic = 'force-dynamic';
export const POST = handleApproveLock;

export function GET() {
  return new NextResponse(null, { status: 405, headers: { Allow: 'POST' } });
}
