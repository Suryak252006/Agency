import { NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { apiSuccess, apiError, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { db } from '@/lib/db';
import { ChangePasswordSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser();
    const body = await request.json();
    const data = ChangePasswordSchema.parse(body);

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { id: true, password: true },
    });
    if (!dbUser) {
      return apiError('NOT_FOUND', 'User not found', requestId, undefined, 404);
    }

    const valid = await compare(data.currentPassword, dbUser.password);
    if (!valid) {
      return apiError('INVALID_PASSWORD', 'Current password is incorrect', requestId, undefined, 400);
    }

    const hashed = await hash(data.newPassword, 12);
    await db.user.update({
      where: { id: user.id },
      data: { password: hashed, requiresPasswordChange: false },
    });

    return NextResponse.json(apiSuccess({ changed: true }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/auth/change-password');
  }
}
