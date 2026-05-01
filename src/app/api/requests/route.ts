import { type NextRequest, NextResponse } from 'next/server';
import { apiError, apiSuccess, generateRequestId, handleApiError, parseBody } from '@/lib/server/api';
import { GetRequestsQuerySchema, CreateRequestSchema } from '@/schemas';
import { requireSessionUser } from '@/lib/server/session';
import { createRequest, getRequests } from '@/lib/server/requests';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const query = GetRequestsQuerySchema.parse({
      status: searchParams.get('status') ?? undefined,
      type: searchParams.get('type') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: Math.min(Number(searchParams.get('limit') ?? 20), 100), // Cap at 100
    });

    const results = await getRequests(user, query.status, query.type, query.limit, query.page * query.limit);
    return NextResponse.json(apiSuccess(results, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/requests');
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const parsed = await parseBody(request, CreateRequestSchema);
    if (!parsed.success) {
      return apiError(parsed.error.code, parsed.error.message, requestId, parsed.error.details, 400);
    }

    const user = await requireSessionUser({ roles: ['faculty'] });
    const created = await createRequest(user, parsed.data.type, parsed.data.reason, parsed.data.marksId);
    return NextResponse.json(apiSuccess({ request: created }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/requests');
  }
}
