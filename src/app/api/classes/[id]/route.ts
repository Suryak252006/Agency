import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = generateRequestId();

  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const includeStudents = searchParams.get('includeStudents') === 'true';
    const studentPage = Math.max(0, Number(searchParams.get('studentPage') ?? 0));
    const studentLimit = Math.min(Number(searchParams.get('studentLimit') ?? 20), 100); // Cap at 100

    const classRecord = await db.class.findFirst({
      where: {
        id: params.id,
        schoolId: user.schoolId,
        ...(user.role === 'faculty'
          ? {
              faculty: {
                userId: user.id,
              },
            }
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
            user: {
              select: { id: true, name: true, email: true },
            },
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
                orderBy: {
                  student: { name: 'asc' },
                },
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
