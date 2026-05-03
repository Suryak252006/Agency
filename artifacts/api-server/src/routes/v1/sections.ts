import { Router } from 'express';
import { z } from 'zod';
import { tenantDb } from '../../lib/db-tenant.js';
import { requireSessionUser } from '../../lib/session.js';
import { generateRequestId, apiSuccess, sendApiError, handleApiError } from '../../lib/api-helpers.js';

const router = Router();

const CreateSectionSchema = z.object({ name: z.string().min(1).max(50) });
const UpdateSectionSchema = CreateSectionSchema.partial();

router.get('/sections', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req);
    const tdb = tenantDb(user.schoolId);
    const sections = await tdb.section.findMany({ orderBy: { name: 'asc' } });
    res.json(apiSuccess({ sections }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'GET /api/v1/sections'); }
});

router.post('/sections', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const data = CreateSectionSchema.parse(req.body);
    const section = await tdb.section.create({ data: { schoolId: user.schoolId, name: data.name } });
    res.status(201).json(apiSuccess({ section }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'POST /api/v1/sections'); }
});

router.get('/sections/:id', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req);
    const tdb = tenantDb(user.schoolId);
    const section = await tdb.section.findFirst({ where: { id: req.params.id } });
    if (!section) { sendApiError(res, 'NOT_FOUND', 'Section not found', requestId, undefined, 404); return; }
    res.json(apiSuccess({ section }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'GET /api/v1/sections/:id'); }
});

router.patch('/sections/:id', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const data = UpdateSectionSchema.parse(req.body);
    const existing = await tdb.section.findFirst({ where: { id: req.params.id } });
    if (!existing) { sendApiError(res, 'NOT_FOUND', 'Section not found', requestId, undefined, 404); return; }
    const section = await tdb.section.update({
      where: { id: req.params.id },
      data: { ...(data.name !== undefined ? { name: data.name } : {}) },
    });
    res.json(apiSuccess({ section }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'PATCH /api/v1/sections/:id'); }
});

router.delete('/sections/:id', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const existing = await tdb.section.findFirst({ where: { id: req.params.id } });
    if (!existing) { sendApiError(res, 'NOT_FOUND', 'Section not found', requestId, undefined, 404); return; }
    await tdb.section.delete({ where: { id: req.params.id } });
    res.json(apiSuccess({ deleted: true, id: req.params.id }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'DELETE /api/v1/sections/:id'); }
});

export default router;
