import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { CreateFeeStructureSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId') ?? undefined;
    const gradeId = searchParams.get('gradeId') ?? undefined;
    const academicYearId = searchParams.get('academicYearId') ?? undefined;

    const where: Record<string, unknown> = { schoolId: user.schoolId };
    if (categoryId) where.categoryId = categoryId;
    if (gradeId) where.gradeId = gradeId;
    if (academicYearId) where.academicYearId = academicYearId;

    const structures = await tdb.feeStructure.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        grade: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
      },
      orderBy: [{ academicYear: { startDate: 'desc' } }, { category: { name: 'asc' } }],
    });

    return NextResponse.json(apiSuccess({ structures }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/fees/structure');
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const body = await request.json();
    const data = CreateFeeStructureSchema.parse(body);

    if (!data.academicYearId || !data.gradeId) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'academicYearId and gradeId are required' },
        { status: 400 }
      );
    }

    const structure = await tdb.feeStructure.create({
      data: {
        schoolId: user.schoolId,
        categoryId: data.categoryId,
        gradeId: data.gradeId,
        academicYearId: data.academicYearId,
        amount: data.amount,
        frequency: data.frequency,
        dueDay: data.dueDay ?? null,
        isOptional: data.isOptional ?? false,
      },
      include: {
        category: { select: { id: true, name: true } },
        grade: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(apiSuccess({ structure }, requestId), { status: 201 });
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/v1/fees/structure');
  }
}
