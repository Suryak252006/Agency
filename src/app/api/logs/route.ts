import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') ?? undefined;
    const days = Number(searchParams.get('days') ?? 30);
    const page = Number(searchParams.get('page') ?? 0);
    const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100); // Cap at 100
    const where: Record<string, any> = {
      schoolId: user.schoolId,
      createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
    };

    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          createdAt: true,
          userId: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: page * limit,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ]);

    return NextResponse.json(apiSuccess({ logs, total, page, limit }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/logs');
  }
}
