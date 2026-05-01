import { type NextRequest, NextResponse } from 'next/server';
import { apiError, apiSuccess, generateRequestId, handleApiError, parseBody } from '@/lib/server/api';
import { RejectRequestSchema } from '@/schemas';
import { requireSessionUser } from '@/lib/server/session';
import { rejectRequest } from '@/lib/server/requests';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = generateRequestId();

  try {
    const parsed = await parseBody(request, RejectRequestSchema);
    if (!parsed.success) {
      return apiError(parsed.error.code, parsed.error.message, requestId, parsed.error.details, 400);
    }

    const user = await requireSessionUser({ roles: ['admin'] });
    const updated = await rejectRequest(params.id, user, parsed.data.response);
    return NextResponse.json(apiSuccess({ request: updated }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/requests/[id]/reject');
  }
}
