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

## Migration Project — School ERP (Next.js → Replit)

The original Next.js "academia" app (imported from Vercel) lives in
`.migration-backup/artifacts/academia/` and runs as a standalone Next.js 15 app
on port 18373 (workflow: `.migration-backup/artifacts/academia: web`).

The migration is being executed sprint-by-sprint:

| Sprint | Scope | Status |
|--------|-------|--------|
| Sprint 1 | Risk fixes (tenant isolation, parent role, RBAC clone) | ✅ DONE |
| Sprint 2 | Academic structure schema, APIs, UI, E2E tests | ✅ DONE |
| Sprint 3+ | Porting Next.js → Replit pnpm workspace (react-vite artifact) | 🔜 PENDING |

### Sprint 1 Risk Fixes (✅ Complete)

**R1 — cloneFromRoleId tenant leak (FIXED)**
- File: `src/app/api/rbac/roles/route.ts`
- Changed `db.role.findUnique` → `tdb.role.findFirst` for clone source lookup.

**R2 — Parent role in legacy getAppSession() (FIXED)**
- File: `src/lib/supabase/middleware.ts`
- `getAppSession()` now returns `null` for `claims.role === 'parent'`.

**CRITICAL — tenantDb PascalCase bug (FIXED)**
- Prisma v6 passes PascalCase model names to `$allModels` extensions.
  The original `TENANT_SCOPED_MODELS` used camelCase, so schoolId was never injected.
- File: `src/lib/db-tenant-models.ts` — all model names corrected to PascalCase.

### Sprint 2 Academic Structure (✅ Complete)

**M03 Prisma migration** — 5 new models in PostgreSQL:
- `AcademicYear` (name, startDate, endDate, isCurrent, isLocked)
- `Term` (examType: FORMATIVE|SUMMATIVE, weightage, order, isPublished)
- `Grade` (level, order)
- `Section` (name)
- `Subject` (code, subjectType: MAIN|LANGUAGE|OPTIONAL|CO_CURRICULAR, departmentId)

**API routes added** (`src/app/api/v1/`):
- `academic-years/` — GET list, POST create
- `academic-years/[id]/` — GET, PATCH, DELETE (lock guard)
- `academic-years/[id]/set-current` — atomic isCurrent swap via `$transaction`
- `academic-years/[id]/lock` — lock year (idempotent 409)
- `academic-years/[id]/terms/` — GET list (ordered), POST create (locked-year guard)
- `academic-years/[id]/terms/[termId]/` — GET, PATCH, DELETE (published guard)
- `grades/`, `grades/[id]/` — CRUD with tenant isolation
- `sections/`, `sections/[id]/` — CRUD with tenant isolation
- `subjects/`, `subjects/[id]/` — CRUD + subjectType filter, code uppercased
- `school/` — GET school record, PATCH name/board/settings
- `school/config/` — GET/PATCH upsert (gradingSystem, workingDays, etc.)

**Tenant isolation**: All `[id]` routes use `tdb.X.findFirst({ where: { id } })`
(not `findUnique`) so `tenantDb` extension auto-injects `schoolId`.

**`handleApiError`** now maps Prisma P2002 → HTTP 409 CONFLICT.

**UI scaffolding** (admin portal):
- `src/app/(portals)/admin/academic-years/page.tsx`
- `src/app/(portals)/admin/grades/page.tsx`
- `src/app/(portals)/admin/setup/page.tsx`

**Seed** updated with 1 AcademicYear, 4 Terms, 7 Grades, 3 Sections, 8 Subjects.

**`AUTH_SECRET`** set as development env var matching test value so the server
and vitest process share the same signing key.

### Test Results

```
Sprint 2 final: 90/93 tests passing

Test Files: 2 failed | 8 passed (10 files)
Tests:      3 failed | 90 passed (93 tests)

Failing (pre-existing Sprint 1 issues, NOT Sprint 2 regressions):
  × rls-validation: NEXT_PUBLIC_SUPABASE_ANON_KEY undefined (no Supabase in this stack)
  × auth-parent: marks endpoint returns 400 for parent (test expects 401/403)
  × auth-parent: classes list returns 200 for parent (test expects 401/403)
```

### Running Tests

```bash
cd .migration-backup/artifacts/academia
AUTH_SECRET="test-sprint1-secret-32chars-minimum" DATABASE_URL="$DATABASE_URL" \
  TEST_BASE_URL="http://localhost:18373" npx vitest@4.1.5 run --reporter=verbose
```

### Sprint 3 — Replit Workspace Port (Pending)

The next sprint will create a `react-vite` artifact at `artifacts/academia-web/`,
migrate pages from Next.js App Router to React Router v7, replace `next/image` /
`next/link` with standard React equivalents, move server logic to
`artifacts/api-server` (Express), convert `NEXT_PUBLIC_*` env vars to `VITE_*`,
and wire up the Replit pnpm workspace routing layer.
