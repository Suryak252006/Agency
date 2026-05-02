import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  try {
    await db.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - startTime;

    return NextResponse.json(
      { status: 'healthy', dbLatencyMs },
      { status: 200 }
    );
  } catch (error) {
    // Log server-side only — never expose DB error details to callers
    console.error('[health] database ping failed:', error instanceof Error ? error.message : error);

    return NextResponse.json(
      { status: 'unhealthy' },
      { status: 503 }
    );
  }
}
