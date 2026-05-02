import { db } from '@/lib/db';
import type { SessionUser } from '@/lib/server/session';

export interface AuditLogFilters {
  action?: string;
  days: number;
  page: number;
  pageSize: number;
}

export async function listAuditLogs(user: SessionUser, filters: AuditLogFilters) {
  const since = new Date();
  since.setDate(since.getDate() - filters.days);

  const where = {
    schoolId: user.schoolId,
    createdAt: {
      gte: since,
    },
    ...(filters.action ? { action: filters.action } : {}),
  };

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
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
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: filters.page * filters.pageSize,
      take: filters.pageSize,
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}
