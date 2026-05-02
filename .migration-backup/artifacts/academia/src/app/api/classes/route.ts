import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requireSessionUser();
    const tdb = tenantDb(user.schoolId);
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId') ?? undefined;
    const includeStudents = searchParams.get('includeStudents') === 'true';
    const includeFaculty = searchParams.get('includeFaculty') === 'true';
    const page = Number(searchParams.get('page') ?? 0);
    const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100);

    const where = {
      ...(classId ? { id: classId } : {}),
      ...(user.role === 'faculty'
        ? { faculty: { userId: user.id } }
        : {}),
    };

    const [classes, total] = await Promise.all([
      tdb.class.findMany({
        where,
        select: {
          id: true,
          schoolId: true,
          name: true,
          grade: true,
          section: true,
          subject: true,
          facultyId: true,
          ...(includeFaculty
            ? {
                faculty: {
                  select: {
                    id: true,
                    userId: true,
                    user: { select: { id: true, name: true, email: true } },
                  },
                },
              }
            : {}),
          ...(includeStudents
            ? {
                students: {
                  select: {
                    student: {
                      select: { id: true, name: true, email: true, rollNo: true },
                    },
                  },
                  orderBy: { student: { name: 'asc' } },
                },
              }
            : {}),
          _count: { select: { students: true } },
        },
        orderBy: [{ grade: 'asc' }, { section: 'asc' }],
        skip: page * limit,
        take: limit,
      }),
      tdb.class.count({ where }),
    ]);

    return NextResponse.json(apiSuccess({ classes, total, page, limit }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/classes');
  }
}
