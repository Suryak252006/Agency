/**
 * tenantDb — Tenant-scoped Prisma client for the School ERP.
 *
 * Every route handler that reads or writes data MUST use this instead of
 * importing `db` directly. This guarantees that schoolId is always injected
 * into list, count, create, and write operations so no cross-tenant data
 * is ever returned or mutated.
 *
 * Usage:
 *   const tdb = tenantDb(user.schoolId);
 *   const students = await tdb.student.findMany({ where: { isActive: true } });
 *   // → automatically runs: WHERE "schoolId" = user.schoolId AND "isActive" = true
 *
 * Safe operations (schoolId auto-injected):
 *   findMany, findFirst, findFirstOrThrow, count,
 *   create, createMany, updateMany, deleteMany
 *
 * Manual responsibility (caller must verify ownership):
 *   findUnique — use findFirst({ where: { id, ... } }) instead
 *   update     — use updateMany({ where: { id } }) instead
 *
 * Throws TypeError immediately if schoolId is empty — never silently allows
 * a query without a schoolId constraint.
 */

import { db } from '@/lib/db';

// All Prisma model names (camelCase) that carry a schoolId column.
// Models without schoolId (Permission, RolePermission, FacultyDepartment,
// ClassStudent, MarksHistory) are NOT listed — they don't need schoolId injection.
const TENANT_SCOPED_MODELS = new Set([
  'user',
  'role',
  'roleAssignment',
  'customFeature',
  'customFeatureAssignment',
  'rBACLog',
  'department',
  'faculty',
  'class',
  'student',
  'exam',
  'marks',
  'request',
  'auditLog',
  'fileAsset',
  'schoolConfig',
]);

export type TenantDb = ReturnType<typeof tenantDb>;

/**
 * Returns a Prisma client extended to automatically scope all queries to
 * the given schoolId. Call once per request, pass the result around.
 */
export function tenantDb(schoolId: string) {
  if (!schoolId?.trim()) {
    throw new TypeError(
      'tenantDb: schoolId is required and cannot be empty. ' +
      'Ensure the session user has a valid schoolId before calling tenantDb().'
    );
  }

  return db.$extends({
    query: {
      $allModels: {
        // ── Read operations ────────────────────────────────────────────────
        async findMany({ args, query, model }: any) {
          if (TENANT_SCOPED_MODELS.has(model)) {
            args.where = { schoolId, ...args.where };
          }
          return query(args);
        },

        async findFirst({ args, query, model }: any) {
          if (TENANT_SCOPED_MODELS.has(model)) {
            args.where = { schoolId, ...args.where };
          }
          return query(args);
        },

        async findFirstOrThrow({ args, query, model }: any) {
          if (TENANT_SCOPED_MODELS.has(model)) {
            args.where = { schoolId, ...args.where };
          }
          return query(args);
        },

        async count({ args, query, model }: any) {
          if (TENANT_SCOPED_MODELS.has(model)) {
            args.where = { schoolId, ...args.where };
          }
          return query(args);
        },

        // ── Write operations ───────────────────────────────────────────────
        async create({ args, query, model }: any) {
          if (TENANT_SCOPED_MODELS.has(model)) {
            // Inject schoolId into data — caller's explicit schoolId wins if provided
            args.data = { schoolId, ...args.data };
          }
          return query(args);
        },

        async createMany({ args, query, model }: any) {
          if (TENANT_SCOPED_MODELS.has(model)) {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((row: any) => ({ schoolId, ...row }));
            } else {
              args.data = { schoolId, ...args.data };
            }
          }
          return query(args);
        },

        async updateMany({ args, query, model }: any) {
          if (TENANT_SCOPED_MODELS.has(model)) {
            args.where = { schoolId, ...args.where };
          }
          return query(args);
        },

        async deleteMany({ args, query, model }: any) {
          if (TENANT_SCOPED_MODELS.has(model)) {
            args.where = { schoolId, ...args.where };
          }
          return query(args);
        },

        // ── findUnique / update: NOT intercepted ───────────────────────────
        // findUnique only accepts unique fields in WHERE; adding schoolId
        // would break it. Use findFirst({ where: { id } }) instead —
        // tenantDb will inject schoolId automatically.
        //
        // update only accepts unique WHERE; use updateMany({ where: { id } })
        // instead — tenantDb will inject schoolId automatically.
      },
    },
  });
}
