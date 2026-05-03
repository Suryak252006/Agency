import { Router } from 'express';
import { z } from 'zod';
import { tenantDb } from '../../lib/db-tenant.js';
import { requireSessionUser } from '../../lib/session.js';
import { generateRequestId, apiSuccess, sendApiError, handleApiError } from '../../lib/api-helpers.js';

const router = Router();

const CreateGradeSchema = z.object({
  name: z.string().min(1).max(50),
  level: z.number().int().min(0).max(12),
  order: z.number().int().min(0).default(0),
});
const UpdateGradeSchema = CreateGradeSchema.partial();

router.get('/grades', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req);
    const tdb = tenantDb(user.schoolId);
    const grades = await tdb.grade.findMany({ orderBy: [{ level: 'asc' }, { order: 'asc' }] });
    res.json(apiSuccess({ grades }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'GET /api/v1/grades'); }
});

router.post('/grades', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const data = CreateGradeSchema.parse(req.body);
    const grade = await tdb.grade.create({
      data: { schoolId: user.schoolId, name: data.name, level: data.level, order: data.order ?? 0 },
    });
    res.status(201).json(apiSuccess({ grade }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'POST /api/v1/grades'); }
});

router.get('/grades/:id', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req);
    const tdb = tenantDb(user.schoolId);
    const grade = await tdb.grade.findFirst({ where: { id: req.params.id } });
    if (!grade) { sendApiError(res, 'NOT_FOUND', 'Grade not found', requestId, undefined, 404); return; }
    res.json(apiSuccess({ grade }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'GET /api/v1/grades/:id'); }
});

router.patch('/grades/:id', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const data = UpdateGradeSchema.parse(req.body);
    const existing = await tdb.grade.findFirst({ where: { id: req.params.id } });
    if (!existing) { sendApiError(res, 'NOT_FOUND', 'Grade not found', requestId, undefined, 404); return; }
    const grade = await tdb.grade.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.level !== undefined ? { level: data.level } : {}),
        ...(data.order !== undefined ? { order: data.order } : {}),
      },
    });
    res.json(apiSuccess({ grade }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'PATCH /api/v1/grades/:id'); }
});

router.delete('/grades/:id', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const existing = await tdb.grade.findFirst({ where: { id: req.params.id } });
    if (!existing) { sendApiError(res, 'NOT_FOUND', 'Grade not found', requestId, undefined, 404); return; }
    await tdb.grade.delete({ where: { id: req.params.id } });
    res.json(apiSuccess({ deleted: true, id: req.params.id }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'DELETE /api/v1/grades/:id'); }
});

export default router;
