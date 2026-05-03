import { NextResponse } from 'next/server';
import { handleApproveLock } from '@/modules/academic/marks/http';

export const dynamic = 'force-dynamic';
export const PATCH = handleApproveLock;

export function GET() {
  return new NextResponse(null, { status: 405, headers: { Allow: 'PATCH' } });
}
