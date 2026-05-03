import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin', 'faculty'] });
    const tdb = tenantDb(user.schoolId);
    const { id: studentId } = await params;
    const { searchParams } = new URL(request.url);
    const termId = searchParams.get('termId') ?? undefined;

    const marks = await tdb.marks.findMany({
      where: {
        studentId,
        schoolId: user.schoolId,
      },
      include: {
        exam: {
          select: {
            id: true,
            name: true,
            maxMarks: true,
            startDate: true,
          },
        },
      },
      orderBy: { exam: { startDate: 'desc' } },
    });

    return NextResponse.json(apiSuccess({ marks }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/students/[id]/marks');
  }
}
