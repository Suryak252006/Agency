import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateStudentSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  rollNo: z.string().min(1).max(30).optional(),
  admissionNo: z.string().max(30).optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  phone: z.string().max(20).optional(),
  bloodGroup: z.string().max(5).optional(),
  religion: z.string().max(50).optional(),
  currentGradeId: z.string().optional(),
  currentSectionId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin', 'faculty'] });
    const tdb = tenantDb(user.schoolId);
    const { id } = await params;

    const student = await tdb.student.findUnique({
      where: { id },
      include: {
        parents: {
          include: {
            parent: {
              select: { id: true, fatherName: true, motherName: true, guardianName: true, primaryPhone: true, email: true },
            },
          },
        },
        classes: {
          include: { class: { select: { id: true, name: true, grade: true, section: true } } },
          orderBy: { enrolledAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!student) {
      return apiError('NOT_FOUND', 'Student not found', requestId, undefined, 404);
    }

    return NextResponse.json(apiSuccess({ student }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/students/[id]');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { id } = await params;
    const body = await request.json();
    const data = UpdateStudentSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        if ((k === 'dateOfBirth') && typeof v === 'string') {
          updateData[k] = new Date(v);
        } else {
          updateData[k] = v;
        }
      }
    }

    const student = await tdb.student.update({ where: { id }, data: updateData });

    return NextResponse.json(apiSuccess({ student }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'PATCH /api/v1/students/[id]');
  }
}
