import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { CreateReportCardConfigSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId') ?? undefined;
    const termId = searchParams.get('termId') ?? undefined;
    const gradeId = searchParams.get('gradeId') ?? undefined;

    const where: Record<string, unknown> = { schoolId: user.schoolId };
    if (academicYearId) where.academicYearId = academicYearId;
    if (termId) where.termId = termId;
    if (gradeId) where.gradeId = gradeId;

    const configs = await tdb.reportCardConfig.findMany({
      where,
      include: {
        term: { select: { id: true, name: true, examType: true } },
        grade: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(apiSuccess({ configs }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/report-cards/config');
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const body = await request.json();
    const data = CreateReportCardConfigSchema.parse(body);

    if (!data.termId || !data.gradeId) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'termId and gradeId are required' },
        { status: 400 }
      );
    }

    const config = await tdb.reportCardConfig.create({
      data: {
        schoolId: user.schoolId,
        academicYearId: data.academicYearId,
        termId: data.termId,
        gradeId: data.gradeId,
        template: data.template ?? 'CBSE_10_POINT',
        showAttendance: data.includeAttendance ?? true,
        showRemarks: data.includeRemarks ?? true,
      },
      include: {
        term: { select: { id: true, name: true, examType: true } },
        grade: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(apiSuccess({ config }, requestId), { status: 201 });
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/v1/report-cards/config');
  }
}
