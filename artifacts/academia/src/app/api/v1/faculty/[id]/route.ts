import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const AssignDepartmentSchema = z.object({
  departmentId: z.string().cuid(),
  primary: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin', 'faculty'] });
    const tdb = tenantDb(user.schoolId);
    const { id } = await params;

    const faculty = await tdb.faculty.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } },
        departments: {
          include: { department: { select: { id: true, name: true, code: true } } },
        },
        classes: { select: { id: true, name: true, grade: true, section: true } },
      },
    });

    if (!faculty || faculty.schoolId !== user.schoolId) {
      return apiError('NOT_FOUND', 'Faculty member not found', requestId, undefined, 404);
    }

    return NextResponse.json(apiSuccess({ faculty }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/faculty/[id]');
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

    const existing = await tdb.faculty.findUnique({ where: { id } });
    if (!existing || existing.schoolId !== user.schoolId) {
      return apiError('NOT_FOUND', 'Faculty member not found', requestId, undefined, 404);
    }

    if (body.addDepartment) {
      const dept = AssignDepartmentSchema.parse(body.addDepartment);
      await tdb.facultyDepartment.upsert({
        where: { facultyId_departmentId: { facultyId: id, departmentId: dept.departmentId } },
        create: { facultyId: id, departmentId: dept.departmentId, primary: dept.primary ?? false },
        update: { primary: dept.primary ?? false },
      });
    }

    if (body.removeDepartmentId) {
      await tdb.facultyDepartment.deleteMany({
        where: { facultyId: id, departmentId: body.removeDepartmentId },
      });
    }

    const faculty = await tdb.faculty.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        departments: { include: { department: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json(apiSuccess({ faculty }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'PATCH /api/v1/faculty/[id]');
  }
}
