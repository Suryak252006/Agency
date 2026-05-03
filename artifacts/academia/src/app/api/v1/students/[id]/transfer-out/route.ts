import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const TransferOutSchema = z.object({
  reason: z.string().min(3).max(500),
  transferDate: z.string().datetime().optional(),
  destinationSchool: z.string().max(200).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { id } = await params;
    const body = await request.json();
    const data = TransferOutSchema.parse(body);

    const existing = await tdb.student.findUnique({ where: { id } });
    if (!existing) {
      return apiError('NOT_FOUND', 'Student not found', requestId, undefined, 404);
    }
    if (!existing.isActive) {
      return apiError('CONFLICT', 'Student is already inactive', requestId, undefined, 409);
    }

    const student = await tdb.student.update({
      where: { id },
      data: {
        isActive: false,
        address: {
          ...(typeof existing.address === 'object' && existing.address !== null ? existing.address as Record<string, unknown> : {}),
          transferReason: data.reason,
          transferDate: data.transferDate ?? new Date().toISOString(),
          destinationSchool: data.destinationSchool ?? null,
        },
      },
    });

    return NextResponse.json(apiSuccess({ student }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/v1/students/[id]/transfer-out');
  }
}
