import { Router } from 'express';
import { tenantDb } from '../lib/db-tenant.js';
import { requireSessionUser } from '../lib/session.js';
import { generateRequestId, apiSuccess, sendApiError, handleApiError } from '../lib/api-helpers.js';

const router = Router();

// GET /api/rbac/roles
router.get('/rbac/roles', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { page: pageStr, pageSize: pageSizeStr, status, search } = req.query as Record<string, string | undefined>;
    const page = Math.max(1, parseInt(pageStr || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr || '10', 10)));
    const where: Record<string, unknown> = {};
    if (status !== undefined && status !== '') where.status = status === 'active';
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }];
    const [roles, total] = await Promise.all([
      tdb.role.findMany({
        where,
        select: {
          id: true, schoolId: true, name: true, description: true, scope: true, status: true, createdBy: true, createdAt: true, updatedAt: true,
          _count: { select: { permissions: true, userAssignments: true, customFeatureAssignments: true } },
        },
        skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' },
      }),
      tdb.role.count({ where }),
    ]);
    const items = roles.map(({ _count, ...r }) => ({
      ...r,
      permissionCount: _count.permissions,
      userCount: _count.userAssignments,
      featureCount: _count.customFeatureAssignments,
    }));
    res.json(apiSuccess({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'GET /api/rbac/roles'); }
});

// POST /api/rbac/roles
router.post('/rbac/roles', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req, { roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const canCreate = await tdb.roleAssignment.findFirst({
      where: { userId: user.id, role: { permissions: { some: { permission: { key: 'roles.create' } } } } },
    });
    if (!canCreate) { sendApiError(res, 'FORBIDDEN', 'Forbidden', requestId, undefined, 403); return; }
    const { name, description, scope, cloneFromRoleId, permissionIds } = req.body;
    const existing = await tdb.role.findFirst({ where: { name } });
    if (existing) { sendApiError(res, 'CONFLICT', 'Role name already exists', requestId, undefined, 409); return; }
    let permIds: string[] = permissionIds ?? [];
    if (cloneFromRoleId) {
      const src = await tdb.role.findFirst({ where: { id: cloneFromRoleId }, include: { permissions: { select: { permissionId: true } } } });
      if (src) permIds = src.permissions.map((p: any) => p.permissionId);
    }
    const role = await tdb.role.create({
      data: {
        schoolId: user.schoolId, name, description, scope, createdBy: user.id,
        permissions: permIds.length > 0 ? { create: permIds.map((pid) => ({ permissionId: pid })) } : undefined,
      },
    });
    res.status(201).json(apiSuccess({ role }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'POST /api/rbac/roles'); }
});

// GET /api/rbac/custom-features
router.get('/rbac/custom-features', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser(req);
    const tdb = tenantDb(user.schoolId);
    const { page: pageStr, pageSize: pageSizeStr, status, module: moduleName, search } = req.query as Record<string, string | undefined>;
    const page = Math.max(1, parseInt(pageStr || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr || '10', 10)));
    const where: Record<string, unknown> = {};
    if (status !== undefined && status !== '') where.status = status;
    if (moduleName !== undefined && moduleName !== '') where.module = moduleName;
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { key: { contains: search, mode: 'insensitive' } }];
    if (user.role === 'faculty') {
      where.assignments = { some: { userId: user.id, OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }] } };
    }
    const [features, total] = await Promise.all([
      tdb.customFeature.findMany({
        where,
        select: { id: true, schoolId: true, name: true, key: true, module: true, description: true, type: true, scope: true, status: true, createdAt: true, updatedAt: true },
        skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' },
      }),
      tdb.customFeature.count({ where }),
    ]);
    res.json(apiSuccess({ items: features, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }, requestId));
  } catch (error) { handleApiError(res, error, requestId, 'GET /api/rbac/custom-features'); }
});

export default router;
