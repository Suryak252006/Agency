import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { parsePagination } from '@/shared/api/pagination';
import { listAuditLogs } from './service';

export async function handleListAuditLogs(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const { searchParams } = new URL(request.url);
    const pagination = parsePagination(searchParams, { pageSize: 20, maxPageSize: 100 });
    const days = Math.max(1, Number(searchParams.get('days') ?? 30));
    const action = searchParams.get('action') ?? undefined;

    const result = await listAuditLogs(user, {
      action,
      days,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });

    return NextResponse.json(apiSuccess(result, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET audit logs');
  }
}
