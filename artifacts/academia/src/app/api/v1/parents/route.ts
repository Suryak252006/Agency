import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { CreateParentSchema, PaginationSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { searchParams } = new URL(request.url);
    const { page, limit } = PaginationSchema.parse({
      page: searchParams.get('page') ?? 0,
      limit: searchParams.get('limit') ?? 20,
    });
    const search = searchParams.get('search') ?? undefined;

    const where = search
      ? {
          schoolId: user.schoolId,
          OR: [
            { fatherName: { contains: search, mode: 'insensitive' as const } },
            { motherName: { contains: search, mode: 'insensitive' as const } },
            { guardianName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { primaryPhone: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : { schoolId: user.schoolId };

    const [parents, total] = await Promise.all([
      tdb.parent.findMany({
        where,
        include: {
          children: {
            include: { student: { select: { id: true, name: true, rollNo: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: page * limit,
        take: limit,
      }),
      tdb.parent.count({ where }),
    ]);

    return NextResponse.json(apiSuccess({ parents, total, page, limit }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/parents');
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const body = await request.json();
    const data = CreateParentSchema.parse(body);

    const parent = await tdb.parent.create({
      data: {
        schoolId: user.schoolId,
        fatherName: data.fatherName ?? null,
        motherName: data.motherName ?? null,
        guardianName: data.guardianName ?? null,
        primaryPhone: data.primaryPhone,
        secondaryPhone: data.secondaryPhone ?? null,
        email: data.email ?? null,
        occupation: data.occupation ?? null,
        address: data.address ? { street: data.address } : undefined,
      },
    });

    return NextResponse.json(apiSuccess({ parent }, requestId), { status: 201 });
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/v1/parents');
  }
}
