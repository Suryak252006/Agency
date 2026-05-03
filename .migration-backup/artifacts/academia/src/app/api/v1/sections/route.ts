import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { CreateSectionSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser();
    const tdb = tenantDb(user.schoolId);

    const sections = await tdb.section.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(apiSuccess({ sections }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/sections');
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser('admin');
    const tdb = tenantDb(user.schoolId);
    const body = await request.json();
    const data = CreateSectionSchema.parse(body);

    const section = await tdb.section.create({
      data: { schoolId: user.schoolId, name: data.name },
    });

    return NextResponse.json(apiSuccess({ section }, requestId), { status: 201 });
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/v1/sections');
  }
}
