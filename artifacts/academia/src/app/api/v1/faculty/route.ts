import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { z } from 'zod';
import { PaginationSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

const CreateFacultySchema = z.object({
  userId: z.string().cuid(),
});

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { searchParams } = new URL(request.url);
    const { page, limit } = PaginationSchema.parse({
      page: searchParams.get('page') ?? 0,
      limit: searchParams.get('limit') ?? 30,
    });
    const departmentId = searchParams.get('departmentId') ?? undefined;
    const search = searchParams.get('search') ?? undefined;

    const where: Record<string, unknown> = { schoolId: user.schoolId };
    if (departmentId) {
      where.departments = { some: { departmentId } };
    }
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [faculty, total] = await Promise.all([
      tdb.faculty.findMany({
        where,
        orderBy: { user: { name: 'asc' } },
        skip: page * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          departments: {
            include: { department: { select: { id: true, name: true } } },
          },
        },
      }),
      tdb.faculty.count({ where }),
    ]);

    return NextResponse.json(apiSuccess({ faculty, total, page, limit }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/faculty');
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const body = await request.json();
    const data = CreateFacultySchema.parse(body);

    const faculty = await tdb.faculty.create({
      data: {
        schoolId: user.schoolId,
        userId: data.userId,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return NextResponse.json(apiSuccess({ faculty }, requestId), { status: 201 });
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/v1/faculty');
  }
}
