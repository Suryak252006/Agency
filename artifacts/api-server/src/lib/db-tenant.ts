import { db } from './db.js';
import { TENANT_SCOPED_MODELS } from './db-tenant-models.js';

export { TENANT_SCOPED_MODELS };
export type TenantDb = ReturnType<typeof tenantDb>;

export function tenantDb(schoolId: string) {
  if (!schoolId?.trim()) {
    throw new TypeError('tenantDb: schoolId is required and cannot be empty.');
  }
  return db.$extends({
    query: {
      $allModels: {
        async findMany({ args, query, model }: any) {
          if (TENANT_SCOPED_MODELS.has(model)) args.where = { schoolId, ...args.where };
          return query(args);
        },
        async findFirst({ args, query, model }: any) {
          if (TENANT_SCOPED_MODELS.has(model)) args.where = { schoolId, ...args.where };
          return query(args);
        },
        async findFirstOrThrow({ args, query, model }: any) {
          if (TENANT_SCOPED_MODELS.has(model)) args.where = { schoolId, ...args.where };
          return query(args);
        },
        async count({ args, query, model }: any) {
          if (TENANT_SCOPED_MODELS.has(model)) args.where = { schoolId, ...args.where };
          return query(args);
        },
        async create({ args, query, model }: any) {
          if (TENANT_SCOPED_MODELS.has(model)) args.data = { schoolId, ...args.data };
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
          if (TENANT_SCOPED_MODELS.has(model)) args.where = { schoolId, ...args.where };
          return query(args);
        },
        async deleteMany({ args, query, model }: any) {
          if (TENANT_SCOPED_MODELS.has(model)) args.where = { schoolId, ...args.where };
          return query(args);
        },
      },
    },
  });
}
