import { Router } from 'express';
import { tenantDb } from '../lib/db-tenant.js';
import { requireSessionUser } from '../lib/session.js';
import { generateRequestId, apiSuccess, handleApiError } from '../lib/api-helpers.js';

const router = Router();

// GET /api/admin/users
router.get('/admin/users', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { page: pageStr, pageSize: pageSizeStr } = req.query as Record<string, string | undefined>;
    const page = Math.max(1, parseInt(pageStr || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr || '20', 10)));
    const [users, total] = await Promise.all([
      tdb.user.findMany({
        select: { id: true, email: true, name: true, role: true, schoolId: true, isActive: true, createdAt: true, lastLoginAt: true },
        skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' },
      }),
      tdb.user.count(),
    ]);
    res.json(apiSuccess({ users, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'GET /api/admin/users'); }
});

export default router;
