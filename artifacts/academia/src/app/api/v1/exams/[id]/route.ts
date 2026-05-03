import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateExamSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  maxMarks: z.number().int().min(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
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

    const exam = await tdb.exam.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        _count: { select: { marks: true } },
      },
    });

    if (!exam || exam.schoolId !== user.schoolId) {
      return apiError('NOT_FOUND', 'Exam not found', requestId, undefined, 404);
    }

    return NextResponse.json(apiSuccess({ exam }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/exams/[id]');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin', 'faculty'] });
    const tdb = tenantDb(user.schoolId);
    const { id } = await params;
    const body = await request.json();
    const data = UpdateExamSchema.parse(body);

    const existing = await tdb.exam.findUnique({ where: { id } });
    if (!existing || existing.schoolId !== user.schoolId) {
      return apiError('NOT_FOUND', 'Exam not found', requestId, undefined, 404);
    }

    const updateData: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        if ((k === 'startDate' || k === 'endDate') && typeof v === 'string') {
          updateData[k] = new Date(v);
        } else {
          updateData[k] = v;
        }
      }
    }

    const exam = await tdb.exam.update({ where: { id }, data: updateData });
    return NextResponse.json(apiSuccess({ exam }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'PATCH /api/v1/exams/[id]');
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

    const existing = await tdb.exam.findUnique({
      where: { id },
      include: { _count: { select: { marks: true } } },
    });
    if (!existing || existing.schoolId !== user.schoolId) {
      return apiError('NOT_FOUND', 'Exam not found', requestId, undefined, 404);
    }
    if (existing._count.marks > 0) {
      return apiError('CONFLICT', 'Cannot delete exam with existing marks entries', requestId, undefined, 409);
    }

    await tdb.exam.delete({ where: { id } });
    return NextResponse.json(apiSuccess({ deleted: true }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'DELETE /api/v1/exams/[id]');
  }
}
