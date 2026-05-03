import { Router } from 'express';
import { tenantDb } from '../lib/db-tenant.js';
import { requireSessionUser } from '../lib/session.js';
import { generateRequestId, apiSuccess, sendApiError, handleApiError } from '../lib/api-helpers.js';

const router = Router();

// GET /api/classes
router.get('/classes', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin', 'faculty'] });
    const tdb = tenantDb(user.schoolId);
    const { classId, includeStudents, includeFaculty, page, limit } = req.query as Record<string, string | undefined>;
    const pageNum = Number(page ?? 0);
    const limitNum = Math.min(Number(limit ?? 20), 100);
    const where = {
      ...(classId ? { id: classId } : {}),
      ...(user.role === 'faculty' ? { faculty: { userId: user.id } } : {}),
    };
    const [classes, total] = await Promise.all([
      tdb.class.findMany({
        where,
        select: {
          id: true, schoolId: true, name: true, grade: true, section: true, subject: true, facultyId: true,
          ...(includeFaculty === 'true' ? { faculty: { select: { id: true, userId: true, user: { select: { id: true, name: true, email: true } } } } } : {}),
          ...(includeStudents === 'true' ? { students: { select: { student: { select: { id: true, name: true, email: true, rollNo: true } } }, orderBy: { student: { name: 'asc' } } } } : {}),
        },
        skip: pageNum * limitNum,
        take: limitNum,
        orderBy: [{ grade: 'asc' }, { section: 'asc' }, { name: 'asc' }],
      }),
      tdb.class.count({ where }),
    ]);
    res.json(apiSuccess({ classes, total, page: pageNum, limit: limitNum }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'GET /api/classes'); }
});

// GET /api/classes/:id
router.get('/classes/:id', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req);
    const tdb = tenantDb(user.schoolId);
    const { includeStudents, studentPage, studentLimit } = req.query as Record<string, string | undefined>;
    const sPage = Math.max(0, Number(studentPage ?? 0));
    const sLimit = Math.min(Number(studentLimit ?? 20), 100);
    const classRecord = await tdb.class.findFirst({
      where: {
        id: req.params.id,
        ...(user.role === 'faculty' ? { faculty: { userId: user.id } } : {}),
      },
      select: {
        id: true, name: true, grade: true, section: true, subject: true, schoolId: true, facultyId: true, createdAt: true,
        faculty: { select: { id: true, userId: true, user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { students: true, marks: true } },
        ...(includeStudents === 'true' ? {
          students: {
            select: { id: true, enrolledAt: true, student: { select: { id: true, name: true, email: true, rollNo: true } } },
            orderBy: { student: { name: 'asc' } },
            skip: sPage * sLimit,
            take: sLimit,
          },
        } : {}),
      },
    });
    if (!classRecord) { sendApiError(res, 'NOT_FOUND', 'Class not found', requestId, undefined, 404); return; }
    res.json(apiSuccess({ class: classRecord }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'GET /api/classes/:id'); }
});

export default router;
