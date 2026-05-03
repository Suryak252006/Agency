import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { CreateSubjectSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser();
    const tdb = tenantDb(user.schoolId);
    const { searchParams } = new URL(request.url);
    const subjectType = searchParams.get('subjectType') ?? undefined;
    const departmentId = searchParams.get('departmentId') ?? undefined;

    const subjects = await tdb.subject.findMany({
      where: {
        ...(subjectType ? { subjectType: subjectType as any } : {}),
        ...(departmentId ? { departmentId } : {}),
      },
      include: {
        department: { select: { id: true, name: true } },
      },
      orderBy: [{ subjectType: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(apiSuccess({ subjects }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/subjects');
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser('admin');
    const tdb = tenantDb(user.schoolId);
    const body = await request.json();
    const data = CreateSubjectSchema.parse(body);

    const subject = await tdb.subject.create({
      data: {
        schoolId: user.schoolId,
        name: data.name,
        code: data.code.toUpperCase(),
        subjectType: data.subjectType ?? 'MAIN',
        departmentId: data.departmentId ?? null,
      },
      include: { department: { select: { id: true, name: true } } },
    });

    return NextResponse.json(apiSuccess({ subject }, requestId), { status: 201 });
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/v1/subjects');
  }
}
