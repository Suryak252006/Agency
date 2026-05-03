import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateDeptSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  code: z.string().max(20).optional(),
  headId: z.string().cuid().nullable().optional(),
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

    const department = await tdb.department.findUnique({
      where: { id },
      include: {
        head: { select: { id: true, name: true, email: true } },
        faculty: {
          include: { faculty: { include: { user: { select: { id: true, name: true, email: true } } } } },
        },
        _count: { select: { exams: true } },
      },
    });

    if (!department || department.schoolId !== user.schoolId) {
      return apiError('NOT_FOUND', 'Department not found', requestId, undefined, 404);
    }

    return NextResponse.json(apiSuccess({ department }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/departments/[id]');
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
    const data = UpdateDeptSchema.parse(body);

    const existing = await tdb.department.findUnique({ where: { id } });
    if (!existing || existing.schoolId !== user.schoolId) {
      return apiError('NOT_FOUND', 'Department not found', requestId, undefined, 404);
    }

    const updateData: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) updateData[k] = v;
    }

    const department = await tdb.department.update({ where: { id }, data: updateData });
    return NextResponse.json(apiSuccess({ department }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'PATCH /api/v1/departments/[id]');
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { id } = await params;

    const existing = await tdb.department.findUnique({
      where: { id },
      include: { _count: { select: { exams: true, faculty: true } } },
    });
    if (!existing || existing.schoolId !== user.schoolId) {
      return apiError('NOT_FOUND', 'Department not found', requestId, undefined, 404);
    }
    if (existing._count.exams > 0 || existing._count.faculty > 0) {
      return apiError('CONFLICT', 'Cannot delete department with linked exams or faculty', requestId, undefined, 409);
    }

    await tdb.department.delete({ where: { id } });
    return NextResponse.json(apiSuccess({ deleted: true }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'DELETE /api/v1/departments/[id]');
  }
}
