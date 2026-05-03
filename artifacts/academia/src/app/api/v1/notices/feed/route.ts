import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';

export const dynamic = 'force-dynamic';

const ROLE_AUDIENCES: Record<string, string[]> = {
  admin: ['ALL', 'ADMIN_ONLY', 'FACULTY', 'PARENTS', 'STUDENTS', 'SPECIFIC_GRADES'],
  faculty: ['ALL', 'FACULTY'],
  parent: ['ALL', 'PARENTS'],
  student: ['ALL', 'STUDENTS'],
};

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser();
    const tdb = tenantDb(user.schoolId);
    const { searchParams } = new URL(request.url);
    const page = Math.max(0, Number(searchParams.get('page') ?? 0));
    const limit = Math.min(50, Number(searchParams.get('limit') ?? 20));

    const allowedAudiences = ROLE_AUDIENCES[user.role] ?? ['ALL'];

    const notices = await tdb.notice.findMany({
      where: {
        schoolId: user.schoolId,
        isPublished: true,
        targetAudience: { in: allowedAudiences as ('ALL' | 'ADMIN_ONLY' | 'FACULTY' | 'PARENTS' | 'STUDENTS' | 'SPECIFIC_GRADES')[] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        id: true,
        title: true,
        body: true,
        type: true,
        targetAudience: true,
        priority: true,
        publishedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: [{ priority: 'desc' }, { publishedAt: 'desc' }],
      skip: page * limit,
      take: limit,
    });

    return NextResponse.json(apiSuccess({ notices }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/notices/feed');
  }
}
