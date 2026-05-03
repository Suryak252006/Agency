import { tenantDb } from '@/lib/db-tenant';
import type { SessionUser } from '@/lib/server/session';

export interface AuditLogFilters {
  action?: string;
  days: number;
  page: number;
  pageSize: number;
}

export async function listAuditLogs(user: SessionUser, filters: AuditLogFilters) {
  const tdb = tenantDb(user.schoolId);
  const since = new Date();
  since.setDate(since.getDate() - filters.days);

  const where = {
    createdAt: { gte: since },
    ...(filters.action ? { action: filters.action } : {}),
  };

  const [logs, total] = await Promise.all([
    tdb.auditLog.findMany({
      where,
      select: {
        id: true,
        schoolId: true,
        userId: true,
        action: true,
        entity: true,
        entityId: true,
        changes: true,
        ipAddress: true,
        createdAt: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: filters.page * filters.pageSize,
      take: filters.pageSize,
    }),
    tdb.auditLog.count({ where }),
  ]);

  return { logs, total, page: filters.page, pageSize: filters.pageSize };
}
