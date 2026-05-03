import { Router } from 'express';
import { z } from 'zod';
import { tenantDb } from '../../lib/db-tenant.js';
import { requireSessionUser } from '../../lib/session.js';
import { generateRequestId, apiSuccess, sendApiError, handleApiError } from '../../lib/api-helpers.js';

const router = Router();

const SubjectTypeSchema = z.enum(['MAIN','OPTIONAL','CO_CURRICULAR','LANGUAGE']);
const CreateSubjectSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  subjectType: SubjectTypeSchema.default('MAIN'),
  departmentId: z.string().optional(),
});
const UpdateSubjectSchema = CreateSubjectSchema.partial();

router.get('/subjects', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req);
    const tdb = tenantDb(user.schoolId);
    const { subjectType, departmentId } = req.query as Record<string, string | undefined>;
    const subjects = await tdb.subject.findMany({
      where: {
        ...(subjectType ? { subjectType: subjectType as any } : {}),
        ...(departmentId ? { departmentId } : {}),
      },
      include: { department: { select: { id: true, name: true } } },
      orderBy: [{ subjectType: 'asc' }, { name: 'asc' }],
    });
    res.json(apiSuccess({ subjects }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'GET /api/v1/subjects'); }
});

router.post('/subjects', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const data = CreateSubjectSchema.parse(req.body);
    const subject = await tdb.subject.create({
      data: {
        schoolId: user.schoolId,
        name: data.name,
        code: data.code.toUpperCase(),
        subjectType: data.subjectType ?? 'MAIN',
        departmentId: data.departmentId ?? null,
      },
      include: { department: { select: { id: true, name: true } } },
    });
    res.status(201).json(apiSuccess({ subject }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'POST /api/v1/subjects'); }
});

router.get('/subjects/:id', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req);
    const tdb = tenantDb(user.schoolId);
    const subject = await tdb.subject.findFirst({
      where: { id: req.params.id },
      include: { department: { select: { id: true, name: true } } },
    });
    if (!subject) { sendApiError(res, 'NOT_FOUND', 'Subject not found', requestId, undefined, 404); return; }
    res.json(apiSuccess({ subject }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'GET /api/v1/subjects/:id'); }
});

router.patch('/subjects/:id', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const data = UpdateSubjectSchema.parse(req.body);
    const existing = await tdb.subject.findFirst({ where: { id: req.params.id } });
    if (!existing) { sendApiError(res, 'NOT_FOUND', 'Subject not found', requestId, undefined, 404); return; }
    const subject = await tdb.subject.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.code !== undefined ? { code: data.code.toUpperCase() } : {}),
        ...(data.subjectType !== undefined ? { subjectType: data.subjectType } : {}),
        ...(data.departmentId !== undefined ? { departmentId: data.departmentId ?? null } : {}),
      },
      include: { department: { select: { id: true, name: true } } },
    });
    res.json(apiSuccess({ subject }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'PATCH /api/v1/subjects/:id'); }
});

router.delete('/subjects/:id', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const existing = await tdb.subject.findFirst({ where: { id: req.params.id } });
    if (!existing) { sendApiError(res, 'NOT_FOUND', 'Subject not found', requestId, undefined, 404); return; }
    await tdb.subject.delete({ where: { id: req.params.id } });
    res.json(apiSuccess({ deleted: true, id: req.params.id }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'DELETE /api/v1/subjects/:id'); }
});

export default router;
