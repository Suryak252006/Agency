import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { CreateGradeSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser();
    const tdb = tenantDb(user.schoolId);

    const grades = await tdb.grade.findMany({
      orderBy: [{ level: 'asc' }, { order: 'asc' }],
    });

    return NextResponse.json(apiSuccess({ grades }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/grades');
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const body = await request.json();
    const data = CreateGradeSchema.parse(body);

    const grade = await tdb.grade.create({
      data: {
        schoolId: user.schoolId,
        name: data.name,
        level: data.level,
        order: data.order ?? 0,
      },
    });

    return NextResponse.json(apiSuccess({ grade }, requestId), { status: 201 });
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/v1/grades');
  }
}
