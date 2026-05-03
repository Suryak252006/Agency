import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../lib/db.js';
import { tenantDb } from '../../lib/db-tenant.js';
import { requireSessionUser } from '../../lib/session.js';
import { generateRequestId, apiSuccess, sendApiError, handleApiError } from '../../lib/api-helpers.js';

const router = Router();

const CreateAcademicYearSchema = z.object({
  name: z.string().min(1).max(20).regex(/^\d{4}-\d{2,4}$/, 'Name must be in format "2024-25"'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
}).refine((d) => new Date(d.startDate) < new Date(d.endDate), { message: 'startDate must be before endDate', path: ['endDate'] });

const UpdateAcademicYearSchema = z.object({
  name: z.string().min(1).max(20).regex(/^\d{4}-\d{2,4}$/).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const ExamTypeSchema = z.enum(['FORMATIVE','SUMMATIVE','QUARTERLY','HALF_YEARLY','ANNUAL']);

const CreateTermSchema = z.object({
  name: z.string().min(1).max(50),
  examType: ExamTypeSchema,
  order: z.number().int().min(1).max(10),
  weightage: z.number().int().min(1).max(100),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const UpdateTermSchema = CreateTermSchema.partial();

// GET /api/v1/academic-years
router.get('/academic-years', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req);
    const tdb = tenantDb(user.schoolId);
    const academicYears = await tdb.academicYear.findMany({
      orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }],
      include: { terms: { orderBy: { order: 'asc' } } },
    });
    res.json(apiSuccess({ academicYears }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'GET /api/v1/academic-years'); }
});

// POST /api/v1/academic-years
router.post('/academic-years', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const data = CreateAcademicYearSchema.parse(req.body);
    const academicYear = await tdb.academicYear.create({
      data: { schoolId: user.schoolId, name: data.name, startDate: new Date(data.startDate), endDate: new Date(data.endDate) },
    });
    res.status(201).json(apiSuccess({ academicYear }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'POST /api/v1/academic-years'); }
});

// GET /api/v1/academic-years/:id
router.get('/academic-years/:id', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req);
    const tdb = tenantDb(user.schoolId);
    const academicYear = await tdb.academicYear.findFirst({
      where: { id: req.params.id },
      include: { terms: { orderBy: { order: 'asc' } } },
    });
    if (!academicYear) { sendApiError(res, 'NOT_FOUND', 'Academic year not found', requestId, undefined, 404); return; }
    res.json(apiSuccess({ academicYear }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'GET /api/v1/academic-years/:id'); }
});

// PATCH /api/v1/academic-years/:id
router.patch('/academic-years/:id', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const data = UpdateAcademicYearSchema.parse(req.body);
    const existing = await tdb.academicYear.findFirst({ where: { id: req.params.id } });
    if (!existing) { sendApiError(res, 'NOT_FOUND', 'Academic year not found', requestId, undefined, 404); return; }
    if (existing.isLocked) { sendApiError(res, 'LOCKED', 'Academic year is locked and cannot be modified', requestId, undefined, 409); return; }
    const academicYear = await tdb.academicYear.update({
      where: { id: req.params.id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
        ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
      },
    });
    res.json(apiSuccess({ academicYear }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'PATCH /api/v1/academic-years/:id'); }
});

// DELETE /api/v1/academic-years/:id
router.delete('/academic-years/:id', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const existing = await tdb.academicYear.findFirst({ where: { id: req.params.id } });
    if (!existing) { sendApiError(res, 'NOT_FOUND', 'Academic year not found', requestId, undefined, 404); return; }
    if (existing.isLocked) { sendApiError(res, 'LOCKED', 'Academic year is locked and cannot be deleted', requestId, undefined, 409); return; }
    await tdb.academicYear.delete({ where: { id: req.params.id } });
    res.json(apiSuccess({ deleted: true, id: req.params.id }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'DELETE /api/v1/academic-years/:id'); }
});

// POST /api/v1/academic-years/:id/set-current
router.post('/academic-years/:id/set-current', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const existing = await tdb.academicYear.findFirst({ where: { id: req.params.id } });
    if (!existing) { sendApiError(res, 'NOT_FOUND', 'Academic year not found', requestId, undefined, 404); return; }
    const [, academicYear] = await db.$transaction([
      db.academicYear.updateMany({ where: { schoolId: user.schoolId, isCurrent: true }, data: { isCurrent: false } }),
      db.academicYear.update({ where: { id: req.params.id }, data: { isCurrent: true } }),
    ]);
    res.json(apiSuccess({ academicYear }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'POST /api/v1/academic-years/:id/set-current'); }
});

// POST /api/v1/academic-years/:id/lock
router.post('/academic-years/:id/lock', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const existing = await tdb.academicYear.findFirst({ where: { id: req.params.id } });
    if (!existing) { sendApiError(res, 'NOT_FOUND', 'Academic year not found', requestId, undefined, 404); return; }
    if (existing.isLocked) { sendApiError(res, 'ALREADY_LOCKED', 'Academic year is already locked', requestId, undefined, 409); return; }
    const academicYear = await tdb.academicYear.update({ where: { id: req.params.id }, data: { isLocked: true } });
    res.json(apiSuccess({ academicYear }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'POST /api/v1/academic-years/:id/lock'); }
});

// GET /api/v1/academic-years/:id/terms
router.get('/academic-years/:id/terms', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req);
    const tdb = tenantDb(user.schoolId);
    const year = await tdb.academicYear.findFirst({ where: { id: req.params.id } });
    if (!year) { sendApiError(res, 'NOT_FOUND', 'Academic year not found', requestId, undefined, 404); return; }
    const terms = await tdb.term.findMany({ where: { academicYearId: req.params.id }, orderBy: { order: 'asc' } });
    res.json(apiSuccess({ terms }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'GET /api/v1/academic-years/:id/terms'); }
});

// POST /api/v1/academic-years/:id/terms
router.post('/academic-years/:id/terms', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const data = CreateTermSchema.parse(req.body);
    const year = await tdb.academicYear.findFirst({ where: { id: req.params.id } });
    if (!year) { sendApiError(res, 'NOT_FOUND', 'Academic year not found', requestId, undefined, 404); return; }
    if (year.isLocked) { sendApiError(res, 'LOCKED', 'Academic year is locked', requestId, undefined, 409); return; }
    const term = await tdb.term.create({
      data: {
        schoolId: user.schoolId,
        academicYearId: req.params.id,
        name: data.name,
        examType: data.examType,
        order: data.order,
        weightage: data.weightage,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });
    res.status(201).json(apiSuccess({ term }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'POST /api/v1/academic-years/:id/terms'); }
});

// GET /api/v1/academic-years/:id/terms/:termId
router.get('/academic-years/:id/terms/:termId', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req);
    const tdb = tenantDb(user.schoolId);
    const term = await tdb.term.findFirst({ where: { id: req.params.termId, academicYearId: req.params.id } });
    if (!term) { sendApiError(res, 'NOT_FOUND', 'Term not found', requestId, undefined, 404); return; }
    res.json(apiSuccess({ term }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'GET /api/v1/academic-years/:id/terms/:termId'); }
});

// PATCH /api/v1/academic-years/:id/terms/:termId
router.patch('/academic-years/:id/terms/:termId', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const data = UpdateTermSchema.parse(req.body);
    const existing = await tdb.term.findFirst({ where: { id: req.params.termId, academicYearId: req.params.id } });
    if (!existing) { sendApiError(res, 'NOT_FOUND', 'Term not found', requestId, undefined, 404); return; }
    const term = await tdb.term.update({
      where: { id: req.params.termId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.examType !== undefined ? { examType: data.examType } : {}),
        ...(data.order !== undefined ? { order: data.order } : {}),
        ...(data.weightage !== undefined ? { weightage: data.weightage } : {}),
        ...(data.startDate !== undefined ? { startDate: data.startDate ? new Date(data.startDate) : null } : {}),
        ...(data.endDate !== undefined ? { endDate: data.endDate ? new Date(data.endDate) : null } : {}),
      },
    });
    res.json(apiSuccess({ term }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'PATCH /api/v1/academic-years/:id/terms/:termId'); }
});

// DELETE /api/v1/academic-years/:id/terms/:termId
router.delete('/academic-years/:id/terms/:termId', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const existing = await tdb.term.findFirst({ where: { id: req.params.termId, academicYearId: req.params.id } });
    if (!existing) { sendApiError(res, 'NOT_FOUND', 'Term not found', requestId, undefined, 404); return; }
    if (existing.isPublished) { sendApiError(res, 'PUBLISHED', 'Published terms cannot be deleted', requestId, undefined, 409); return; }
    await tdb.term.delete({ where: { id: req.params.termId } });
    res.json(apiSuccess({ deleted: true, id: req.params.termId }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'DELETE /api/v1/academic-years/:id/terms/:termId'); }
});

export default router;
