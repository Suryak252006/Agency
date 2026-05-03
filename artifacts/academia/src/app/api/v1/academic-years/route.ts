import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { CreateAcademicYearSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser();
    const tdb = tenantDb(user.schoolId);

    const academicYears = await tdb.academicYear.findMany({
      orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }],
      include: { terms: { orderBy: { order: 'asc' } } },
    });

    return NextResponse.json(apiSuccess({ academicYears }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/academic-years');
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const body = await request.json();
    const data = CreateAcademicYearSchema.parse(body);

    const academicYear = await tdb.academicYear.create({
      data: {
        schoolId: user.schoolId,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });

    return NextResponse.json(apiSuccess({ academicYear }, requestId), { status: 201 });
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/v1/academic-years');
  }
}
