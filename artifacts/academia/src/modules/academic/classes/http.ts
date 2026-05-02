import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { db } from '@/lib/db';
import { parsePagination } from '@/shared/api/pagination';

export async function handleListClassStudents(request: NextRequest, classId: string) {
  const requestId = generateRequestId();

  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const pagination = parsePagination(searchParams, { pageSize: 100, maxPageSize: 250 });

    const where = {
      classId,
      class: {
        schoolId: user.schoolId,
        ...(user.role === 'faculty'
          ? {
              faculty: {
                userId: user.id,
              },
            }
          : {}),
      },
    };

    const [classStudents, total] = await Promise.all([
      db.classStudent.findMany({
        where,
        select: {
          id: true,
          enrolledAt: true,
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              rollNo: true,
            },
          },
        },
        orderBy: {
          student: {
            name: 'asc',
          },
        },
        skip: pagination.offset,
        take: pagination.pageSize,
      }),
      db.classStudent.count({ where }),
    ]);

    return NextResponse.json(
      apiSuccess(
        {
          students: classStudents.map((entry) => entry.student),
          total,
          page: pagination.page,
          pageSize: pagination.pageSize,
        },
        requestId
      )
    );
  } catch (error) {
    return handleApiError(error, requestId, 'GET class students');
  }
}
