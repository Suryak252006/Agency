import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { UpdateNoticeSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser();
    const tdb = tenantDb(user.schoolId);
    const { id } = await params;

    const notice = await tdb.notice.findUnique({ where: { id } });
    if (!notice) {
      return apiError('NOT_FOUND', 'Notice not found', requestId, undefined, 404);
    }

    if (!notice.isPublished && user.role !== 'admin') {
      return apiError('FORBIDDEN', 'Forbidden', requestId, undefined, 403);
    }

    return NextResponse.json(apiSuccess({ notice }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/notices/[id]');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { id } = await params;
    const body = await request.json();
    const data = UpdateNoticeSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.body = data.content;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.audience !== undefined) updateData.targetAudience = data.audience;
    if (data.publishAt !== undefined) updateData.publishedAt = data.publishAt ? new Date(data.publishAt) : null;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    if (data.priority !== undefined) updateData.priority = data.priority;

    const notice = await tdb.notice.update({ where: { id }, data: updateData });

    return NextResponse.json(apiSuccess({ notice }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'PATCH /api/v1/notices/[id]');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { id } = await params;

    await tdb.notice.delete({ where: { id } });

    return NextResponse.json(apiSuccess({ deleted: true }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'DELETE /api/v1/notices/[id]');
  }
}
