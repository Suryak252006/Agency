import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { UpdateSchoolConfigSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser();
    const tdb = tenantDb(user.schoolId);

    const config = await tdb.schoolConfig.findUnique({
      where: { schoolId: user.schoolId },
    });

    return NextResponse.json(apiSuccess({ config }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/school/config');
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const body = await request.json();
    const data = UpdateSchoolConfigSchema.parse(body);

    const config = await tdb.schoolConfig.upsert({
      where: { schoolId: user.schoolId },
      update: data,
      create: {
        schoolId: user.schoolId,
        ...data,
      },
    });

    return NextResponse.json(apiSuccess({ config }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'PATCH /api/v1/school/config');
  }
}
