import { Router } from 'express';
import { tenantDb } from '../lib/db-tenant.js';
import { requireSessionUser } from '../lib/session.js';
import { generateRequestId, apiSuccess, sendApiError, handleApiError } from '../lib/api-helpers.js';
import { z } from 'zod';

const router = Router();

const CreateFacultySchema = z.object({
  schoolId: z.string().optional(),
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  userId: z.string().optional(),
});

// POST /api/faculty
router.post('/faculty', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const data = CreateFacultySchema.parse(req.body);
    if (data.schoolId && data.schoolId !== user.schoolId) {
      sendApiError(res, 'FORBIDDEN', 'Cannot create faculty for another school', requestId, undefined, 403);
      return;
    }
    const tdb = tenantDb(user.schoolId);
    const faculty = await tdb.faculty.create({
      data: { schoolId: user.schoolId, ...(data.userId ? { userId: data.userId } : {}) },
    });
    res.status(201).json(apiSuccess({ faculty }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'POST /api/faculty'); }
});

export default router;
