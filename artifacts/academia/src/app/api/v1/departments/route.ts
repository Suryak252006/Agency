import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CreateDeptSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().max(20).optional(),
  headId: z.string().cuid().optional(),
});

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin', 'faculty'] });
    const tdb = tenantDb(user.schoolId);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? undefined;

    const where: Record<string, unknown> = { schoolId: user.schoolId };
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const departments = await tdb.department.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        head: { select: { id: true, name: true, email: true } },
        _count: { select: { faculty: true, exams: true } },
      },
    });

    return NextResponse.json(apiSuccess({ departments }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/departments');
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const body = await request.json();
    const data = CreateDeptSchema.parse(body);

    const department = await tdb.department.create({
      data: {
        schoolId: user.schoolId,
        name: data.name,
        code: data.code ?? null,
        headId: data.headId ?? null,
      },
    });

    return NextResponse.json(apiSuccess({ department }, requestId), { status: 201 });
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/v1/departments');
  }
}
