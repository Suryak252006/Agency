import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { id } = await params;

    const existing = await tdb.notice.findUnique({ where: { id } });
    if (!existing) {
      return apiError('NOT_FOUND', 'Notice not found', requestId, undefined, 404);
    }

    const notice = await tdb.notice.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: existing.publishedAt ?? new Date(),
      },
    });

    return NextResponse.json(apiSuccess({ notice }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/v1/notices/[id]/publish');
  }
}
