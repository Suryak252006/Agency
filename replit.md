# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Migration Backup

The original Next.js academia app (imported from Vercel) lives in
`.migration-backup/artifacts/academia/`. Sprint 1 verification and risk fixes
have been applied there. Migration to the Replit pnpm workspace stack has NOT
started yet — that is Sprint 2 prep work.

### Sprint 1 Risk Fixes (completed)

**R1 — cloneFromRoleId tenant leak (FIXED)**
- File: `src/app/api/rbac/roles/route.ts`
- Changed `db.role.findUnique` → `tdb.role.findFirst` for clone source lookup.
  `tdb` is schoolId-scoped, so an admin from School B cannot clone School A's
  permission list even if they know the role ID.

**R2 — Parent role in legacy getAppSession() (FIXED)**
- File: `src/lib/supabase/middleware.ts`
- `getAppSession()` now returns `null` for `claims.role === 'parent'`.
  Previously parent mapped to 'FACULTY' silently. Legacy RBAC decorators
  (withPermission, withRole, etc.) now correctly 401 parent users rather than
  treating them as faculty. Parent routes must use `requireSessionUser()`.
- File: `tests/e2e/helpers.ts`
  `createUserContext` now correctly mints `role='parent'` cookies for
  `UserRole.PARENT` (was incorrectly mapping to 'faculty').

**CRITICAL — tenantDb PascalCase bug (FIXED, discovered during testing)**
- Prisma v6 passes PascalCase model names to `$allModels` extensions
  (`'Role'`, not `'role'`; `'RBACLog'`, not `'rBACLog'`). The original
  `TENANT_SCOPED_MODELS` set used camelCase keys, so `TENANT_SCOPED_MODELS.has(model)`
  was ALWAYS false — schoolId was NEVER injected into any query. The entire
  tenant isolation layer was silently broken from day one.
- File: `src/lib/db-tenant-models.ts` (NEW — extracted from db-tenant.ts)
  All 16 model names updated to PascalCase. Exported so tests can import it.
- File: `src/lib/db-tenant.ts` — now imports from `db-tenant-models.ts`.

**R3 — TENANT_SCOPED_MODELS coverage + tests (FIXED)**
- File: `src/lib/db-tenant-models.ts` — exported constant with PascalCase names,
  Sprint 2 model names documented in comments.
- File: `tests/unit/tenant-scoped-models.test.ts` (NEW) — 9 assertions:
  correct count, all Sprint 1 models present, excluded models absent,
  PascalCase enforcement, no overlap between included/excluded sets.

### New Test Files

| File | Type | Tests | Needs server |
|---|---|---|---|
| `tests/unit/tenant-scoped-models.test.ts` | Unit | 9 | No |
| `tests/e2e/rbac-clone-isolation.test.ts` | E2E/DB | 3 | No |
| `tests/e2e/auth-parent.test.ts` | E2E/Cookie+DB | 9 (4 skip without server) | Partial |

### Test Run Results (Sprint 1 fixes)

```
Tests  21 passed (21)  — unit + new e2e (DB layer + cookie layer)
4 API-layer tests in auth-parent.test.ts gracefully skip when server is down
```

### Running Tests

```bash
cd .migration-backup/artifacts/academia
DATABASE_URL="..." AUTH_SECRET="..." npx vitest@4.1.5 run tests/unit   # no server needed
DATABASE_URL="..." AUTH_SECRET="..." npx vitest@4.1.5 run tests/e2e    # server needed for HTTP tests
```
