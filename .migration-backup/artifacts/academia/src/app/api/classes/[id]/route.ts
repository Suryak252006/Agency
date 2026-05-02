import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = generateRequestId();

  try {
    const user = await requireSessionUser();
    const tdb = tenantDb(user.schoolId);
    const { searchParams } = new URL(request.url);
    const resolvedParams = await params;
    const includeStudents = searchParams.get('includeStudents') === 'true';
    const studentPage = Math.max(0, Number(searchParams.get('studentPage') ?? 0));
    const studentLimit = Math.min(Number(searchParams.get('studentLimit') ?? 20), 100);

    const classRecord = await tdb.class.findFirst({
      where: {
        id: resolvedParams.id,
        ...(user.role === 'faculty'
          ? { faculty: { userId: user.id } }
          : {}),
      },
      select: {
        id: true,
        name: true,
        grade: true,
        section: true,
        subject: true,
        schoolId: true,
        facultyId: true,
        createdAt: true,
        faculty: {
          select: {
            id: true,
            userId: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: { select: { students: true, marks: true } },
        ...(includeStudents
          ? {
              students: {
                select: {
                  id: true,
                  enrolledAt: true,
                  student: {
                    select: { id: true, name: true, email: true, rollNo: true },
                  },
                },
                orderBy: { student: { name: 'asc' } },
                skip: studentPage * studentLimit,
                take: studentLimit,
              },
            }
          : {}),
      },
    });

    if (!classRecord) {
      return NextResponse.json(apiSuccess({ class: null }, requestId));
    }

    return NextResponse.json(apiSuccess({ class: classRecord }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/classes/[id]');
  }
}
