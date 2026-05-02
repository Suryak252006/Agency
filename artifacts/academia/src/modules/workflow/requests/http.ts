import { type NextRequest, NextResponse } from 'next/server';
import {
  apiError,
  apiSuccess,
  generateRequestId,
  handleApiError,
  parseBody,
} from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import {
  ApproveRequestSchema,
  CreateRequestSchema,
  GetRequestsQuerySchema,
  RejectRequestSchema,
  UpdateRequestStatusSchema,
} from '@/schemas';
import {
  approveRequest,
  createRequest,
  getRequests,
  rejectRequest,
} from '@/lib/server/requests';

export async function handleGetRequests(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const query = GetRequestsQuerySchema.parse({
      status: searchParams.get('status') ?? undefined,
      type: searchParams.get('type') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? searchParams.get('pageSize') ?? undefined,
    });

    const results = await getRequests(
      user,
      query.status,
      query.type,
      query.limit,
      query.page * query.limit
    );

    return NextResponse.json(apiSuccess(results, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET requests');
  }
}

export async function handleCreateRequest(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const parsed = await parseBody(request, CreateRequestSchema);
    if (!parsed.success) {
      return apiError(parsed.error.code, parsed.error.message, requestId, parsed.error.details, 400);
    }

    const user = await requireSessionUser({ roles: ['faculty'] });
    const created = await createRequest(user, parsed.data.type, parsed.data.reason, parsed.data.marksId);
    return NextResponse.json(apiSuccess({ request: created }, requestId), { status: 201 });
  } catch (error) {
    return handleApiError(error, requestId, 'POST requests');
  }
}

export async function handlePatchRequest(request: NextRequest, requestItemId: string) {
  const requestId = generateRequestId();

  try {
    const parsed = await parseBody(request, UpdateRequestStatusSchema);
    if (!parsed.success) {
      return apiError(parsed.error.code, parsed.error.message, requestId, parsed.error.details, 400);
    }

    const user = await requireSessionUser({ roles: ['admin'] });
    const updated =
      parsed.data.status === 'APPROVED'
        ? await approveRequest(requestItemId, user, parsed.data.response)
        : await rejectRequest(requestItemId, user, parsed.data.response || '');

    return NextResponse.json(apiSuccess({ request: updated }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'PATCH requests');
  }
}

export async function handleApproveRequest(request: NextRequest, requestItemId: string) {
  const requestId = generateRequestId();

  try {
    const parsed = await parseBody(request, ApproveRequestSchema);
    if (!parsed.success) {
      return apiError(parsed.error.code, parsed.error.message, requestId, parsed.error.details, 400);
    }

    const user = await requireSessionUser({ roles: ['admin'] });
    const updated = await approveRequest(requestItemId, user, parsed.data.response);
    return NextResponse.json(apiSuccess({ request: updated }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'POST request approve');
  }
}

export async function handleRejectRequest(request: NextRequest, requestItemId: string) {
  const requestId = generateRequestId();

  try {
    const parsed = await parseBody(request, RejectRequestSchema);
    if (!parsed.success) {
      return apiError(parsed.error.code, parsed.error.message, requestId, parsed.error.details, 400);
    }

    const user = await requireSessionUser({ roles: ['admin'] });
    const updated = await rejectRequest(requestItemId, user, parsed.data.response);
    return NextResponse.json(apiSuccess({ request: updated }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'POST request reject');
  }
}
