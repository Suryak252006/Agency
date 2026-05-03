import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { UpdateSchoolSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser();
    const tdb = tenantDb(user.schoolId);

    const school = await tdb.tenant.findUnique({
      where: { id: user.schoolId },
      select: {
        id: true,
        slug: true,
        name: true,
        board: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        isActive: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(apiSuccess({ school }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/school');
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser('admin');
    const tdb = tenantDb(user.schoolId);
    const body = await request.json();
    const data = UpdateSchoolSchema.parse(body);

    // Fetch current settings for merge
    const current = await tdb.tenant.findUnique({
      where: { id: user.schoolId },
      select: { settings: true },
    });
    const currentSettings = (current?.settings && typeof current.settings === 'object') ? current.settings as Record<string, unknown> : {};

    const school = await tdb.tenant.update({
      where: { id: user.schoolId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.board ? { board: data.board } : {}),
        ...(data.medium !== undefined || data.logoKey !== undefined
          ? {
              settings: {
                ...currentSettings,
                ...(data.medium !== undefined ? { medium: data.medium } : {}),
                ...(data.logoKey !== undefined ? { logoKey: data.logoKey } : {}),
              },
            }
          : {}),
      },
      select: {
        id: true,
        slug: true,
        name: true,
        board: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        isActive: true,
        settings: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(apiSuccess({ school }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'PATCH /api/v1/school');
  }
}
