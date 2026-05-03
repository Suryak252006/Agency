import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { CreateNoticeSchema, PaginationSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser();
    const tdb = tenantDb(user.schoolId);
    const { searchParams } = new URL(request.url);
    const { page, limit } = PaginationSchema.parse({
      page: searchParams.get('page') ?? 0,
      limit: searchParams.get('limit') ?? 20,
    });
    const audience = searchParams.get('audience') ?? undefined;
    const type = searchParams.get('type') ?? undefined;

    const where: Record<string, unknown> = { schoolId: user.schoolId };
    if (audience) where.targetAudience = audience;
    if (type) where.type = type;

    if (user.role === 'parent' || user.role === 'faculty') {
      where.isPublished = true;
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ];
    }

    const [notices, total] = await Promise.all([
      tdb.notice.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: page * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          type: true,
          targetAudience: true,
          isPublished: true,
          publishedAt: true,
          expiresAt: true,
          priority: true,
          createdAt: true,
        },
      }),
      tdb.notice.count({ where }),
    ]);

    return NextResponse.json(apiSuccess({ notices, total, page, limit }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/notices');
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const body = await request.json();
    const data = CreateNoticeSchema.parse(body);

    const notice = await tdb.notice.create({
      data: {
        schoolId: user.schoolId,
        title: data.title,
        body: data.content,
        type: data.type ?? 'GENERAL',
        targetAudience: data.audience ?? 'ALL',
        publishedAt: data.publishAt ? new Date(data.publishAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isPublished: false,
        priority: data.priority ?? 1,
        createdBy: user.id,
      },
    });

    return NextResponse.json(apiSuccess({ notice }, requestId), { status: 201 });
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/v1/notices');
  }
}
