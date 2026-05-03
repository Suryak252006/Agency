import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['parent'] });
    const tdb = tenantDb(user.schoolId);

    const parent = await tdb.parent.findFirst({
      where: { userId: user.id, schoolId: user.schoolId },
      include: {
        children: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                rollNo: true,
                email: true,
                isActive: true,
                classes: {
                  select: {
                    classId: true,
                    enrolledAt: true,
                  },
                  orderBy: { enrolledAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!parent) {
      return apiError('NOT_FOUND', 'Parent profile not found', requestId, undefined, 404);
    }

    const children = (parent as typeof parent & { children: Array<{ student: { id: string; name: string; rollNo: string; email: string; isActive: boolean; classes: Array<{ classId: string; enrolledAt: Date }> }; relation: string; isPrimary: boolean }> }).children.map((ps) => ({
      ...ps.student,
      currentClassId: ps.student.classes[0]?.classId ?? null,
      relation: ps.relation,
      isPrimary: ps.isPrimary,
    }));

    return NextResponse.json(apiSuccess({ children, parentId: parent.id }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/parent/children');
  }
}
