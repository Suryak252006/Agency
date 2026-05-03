import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['parent'] });
    const tdb = tenantDb(user.schoolId);
    const { studentId } = await params;
    const { searchParams } = new URL(request.url);
    const termId = searchParams.get('termId') ?? undefined;

    const parent = await tdb.parent.findFirst({
      where: { userId: user.id, schoolId: user.schoolId },
      include: { children: { where: { studentId }, select: { studentId: true } } },
    });
    if (!parent || parent.children.length === 0) {
      return apiError('FORBIDDEN', 'Student not linked to this parent', requestId, undefined, 403);
    }

    const marks = await tdb.marks.findMany({
      where: {
        studentId,
        schoolId: user.schoolId,
        status: 'LOCKED',
      },
      include: {
        exam: {
          select: { id: true, name: true, maxMarks: true, startDate: true },
        },
      },
      orderBy: { exam: { startDate: 'desc' } },
    });

    return NextResponse.json(apiSuccess({ marks }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/parent/children/[studentId]/marks');
  }
}
