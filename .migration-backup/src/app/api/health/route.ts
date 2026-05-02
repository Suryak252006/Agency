import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId } from '@/lib/server/api';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Ping database
    await db.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - startTime;

    return NextResponse.json(
      apiSuccess({
        status: 'healthy',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          latencyMs: dbLatency,
        },
      }, requestId),
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      apiSuccess({
        status: 'unhealthy',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }, requestId),
      { status: 503 }
    );
  }
}
