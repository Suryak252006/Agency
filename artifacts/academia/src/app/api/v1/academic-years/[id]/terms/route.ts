import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { CreateTermSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser();
    const tdb = tenantDb(user.schoolId);
    const { id: academicYearId } = await params;

    const year = await tdb.academicYear.findFirst({ where: { id: academicYearId } });
    if (!year) {
      return apiError('NOT_FOUND', 'Academic year not found', requestId, undefined, 404);
    }

    const terms = await tdb.term.findMany({
      where: { academicYearId },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(apiSuccess({ terms }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/academic-years/[id]/terms');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { id: academicYearId } = await params;
    const body = await request.json();
    const data = CreateTermSchema.parse(body);

    const year = await tdb.academicYear.findFirst({ where: { id: academicYearId } });
    if (!year) {
      return apiError('NOT_FOUND', 'Academic year not found', requestId, undefined, 404);
    }
    if (year.isLocked) {
      return apiError('LOCKED', 'Academic year is locked', requestId, undefined, 409);
    }

    const term = await tdb.term.create({
      data: {
        schoolId: user.schoolId,
        academicYearId,
        name: data.name,
        examType: data.examType,
        order: data.order,
        weightage: data.weightage,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });

    return NextResponse.json(apiSuccess({ term }, requestId), { status: 201 });
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/v1/academic-years/[id]/terms');
  }
}
