import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../lib/db.js';
import { tenantDb } from '../../lib/db-tenant.js';
import { requireSessionUser } from '../../lib/session.js';
import { generateRequestId, apiSuccess, handleApiError } from '../../lib/api-helpers.js';

const router = Router();

const UpdateSchoolSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  board: z.enum(['CBSE','ICSE','STATE_BOARD','OTHER']).optional(),
  medium: z.string().max(50).optional(),
  logoKey: z.string().optional(),
});

const UpdateSchoolConfigSchema = z.object({
  gradingSystem: z.enum(['TEN_POINT','PERCENTAGE','LETTER']).optional(),
  workingDays: z.number().int().min(1).max(7).optional(),
  timezone: z.string().optional(),
  academicYearStartMonth: z.number().int().min(1).max(12).optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
});

router.get('/school', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req);
    const school = await db.tenant.findUnique({
      where: { id: user.schoolId },
      select: { id: true, slug: true, name: true, board: true, subscriptionTier: true, subscriptionStatus: true, isActive: true, settings: true, createdAt: true, updatedAt: true },
    });
    res.json(apiSuccess({ school }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'GET /api/v1/school'); }
});

router.patch('/school', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const data = UpdateSchoolSchema.parse(req.body);
    const current = await db.tenant.findUnique({ where: { id: user.schoolId }, select: { settings: true } });
    const currentSettings = (current?.settings && typeof current.settings === 'object') ? current.settings as Record<string, unknown> : {};
    const school = await db.tenant.update({
      where: { id: user.schoolId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.board ? { board: data.board } : {}),
        ...(data.medium !== undefined || data.logoKey !== undefined ? {
          settings: {
            ...currentSettings,
            ...(data.medium !== undefined ? { medium: data.medium } : {}),
            ...(data.logoKey !== undefined ? { logoKey: data.logoKey } : {}),
          },
        } : {}),
      },
      select: { id: true, slug: true, name: true, board: true, subscriptionTier: true, subscriptionStatus: true, isActive: true, settings: true, updatedAt: true },
    });
    res.json(apiSuccess({ school }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'PATCH /api/v1/school'); }
});

router.get('/school/config', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req);
    const tdb = tenantDb(user.schoolId);
    const config = await tdb.schoolConfig.findUnique({ where: { schoolId: user.schoolId } });
    res.json(apiSuccess({ config }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'GET /api/v1/school/config'); }
});

router.patch('/school/config', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const data = UpdateSchoolConfigSchema.parse(req.body);
    const config = await tdb.schoolConfig.upsert({
      where: { schoolId: user.schoolId },
      update: data,
      create: { schoolId: user.schoolId, ...data },
    });
    res.json(apiSuccess({ config }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'PATCH /api/v1/school/config'); }
});

export default router;
