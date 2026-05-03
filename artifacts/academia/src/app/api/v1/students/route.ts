import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { z } from 'zod';
import { PaginationSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

const CreateStudentSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  rollNo: z.string().min(1).max(30),
  admissionNo: z.string().max(30).optional(),
  admissionDate: z.string().datetime().optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  phone: z.string().max(20).optional(),
  currentGradeId: z.string().optional(),
  currentSectionId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin', 'faculty'] });
    const tdb = tenantDb(user.schoolId);
    const { searchParams } = new URL(request.url);
    const { page, limit } = PaginationSchema.parse({
      page: searchParams.get('page') ?? 0,
      limit: searchParams.get('limit') ?? 20,
    });
    const search = searchParams.get('search') ?? undefined;
    const gradeId = searchParams.get('gradeId') ?? undefined;
    const sectionId = searchParams.get('sectionId') ?? undefined;
    const isActive = searchParams.get('isActive');

    const where: Record<string, unknown> = { schoolId: user.schoolId };
    if (isActive !== null) where.isActive = isActive !== 'false';
    if (gradeId) where.currentGradeId = gradeId;
    if (sectionId) where.currentSectionId = sectionId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { rollNo: { contains: search, mode: 'insensitive' } },
        { admissionNo: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [students, total] = await Promise.all([
      tdb.student.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: page * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          rollNo: true,
          admissionNo: true,
          gender: true,
          isActive: true,
          currentGradeId: true,
          currentSectionId: true,
          createdAt: true,
        },
      }),
      tdb.student.count({ where }),
    ]);

    return NextResponse.json(apiSuccess({ students, total, page, limit }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/students');
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const body = await request.json();
    const data = CreateStudentSchema.parse(body);

    const student = await tdb.student.create({
      data: {
        schoolId: user.schoolId,
        name: data.name,
        email: data.email,
        rollNo: data.rollNo,
        admissionNo: data.admissionNo ?? null,
        admissionDate: data.admissionDate ? new Date(data.admissionDate) : null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender ?? null,
        phone: data.phone ?? null,
        currentGradeId: data.currentGradeId ?? null,
        currentSectionId: data.currentSectionId ?? null,
      },
    });

    return NextResponse.json(apiSuccess({ student }, requestId), { status: 201 });
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/v1/students');
  }
}
