import { Router } from 'express';
import { tenantDb } from '../lib/db-tenant.js';
import { requireSessionUser } from '../lib/session.js';
import { generateRequestId, apiSuccess, sendApiError, handleApiError } from '../lib/api-helpers.js';
import { z } from 'zod';

const router = Router();

const ApproveLockSchema = z.object({ marksIds: z.array(z.string()).min(1) });

// GET /api/marks
router.get('/marks', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin', 'faculty'] });
    const tdb = tenantDb(user.schoolId);
    const { examId, classId, status } = req.query as Record<string, string | undefined>;
    if (user.role === 'faculty' && (!examId || !classId)) {
      sendApiError(res, 'VALIDATION_ERROR', 'examId and classId are required for faculty', requestId, undefined, 400);
      return;
    }
    const marks = await tdb.marks.findMany({
      where: {
        ...(examId ? { examId } : {}),
        ...(classId ? { classId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: { student: { select: { id: true, name: true, rollNo: true } } },
      orderBy: { student: { name: 'asc' } },
    });
    res.json(apiSuccess({ marks }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'GET /api/marks'); }
});

// POST /api/marks/approve-lock
router.post('/marks/approve-lock', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const data = ApproveLockSchema.parse(req.body);
    const updated = await tdb.marks.updateMany({
      where: { id: { in: data.marksIds }, status: 'LOCK_PENDING' },
      data: { status: 'LOCKED' },
    });
    res.json(apiSuccess({ approved: updated.count, marksIds: data.marksIds }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'POST /api/marks/approve-lock'); }
});

export default router;
