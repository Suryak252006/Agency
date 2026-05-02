# Academia — School Academic Management System

## Overview
A Next.js 15 school academic management platform using cookie-based auth and Prisma ORM. Features role-based access control (RBAC) for administrators and faculty, with dashboards, marks management, class scheduling, exam tracking, and a custom features/permissions system.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Auth**: Cookie-based HMAC-SHA256 sessions (8h TTL) — Supabase is config/env only, not used at runtime
- **DB**: Replit built-in PostgreSQL via Prisma ORM
- **Styling**: Tailwind CSS v4 + tw-animate-css
- **UI Components**: Radix UI + shadcn/ui, MUI (`@mui/material`)
- **State**: TanStack React Query v5
- **Forms**: react-hook-form + Zod validation
- **Runtime**: Node.js

## Project Structure
```
artifacts/academia/       # Main Next.js app
  src/
    app/                  # Next.js App Router pages & API routes
      admin/              # Admin dashboard (roles, students, requests, logs, RBAC)
      faculty/            # Faculty portal (classes, marks, requests)
      auth/               # Login page
      api/                # API route handlers
      components/         # App-scoped components (app-shell.tsx, etc.)
    components/ui/        # Canonical shadcn/ui components (single source)
    lib/
      client/             # Client-side TanStack Query hooks (hooks.ts, api.ts)
      server/             # Server-side utilities (session, api helpers, marks logic)
      rbac/               # RBAC utilities, constants, permission matrix
    modules/              # Domain modules (academic, requests, etc.)
    middleware.ts          # Edge route protection (auth + role guards)
    schemas/index.ts      # Zod validation schemas
  prisma/                 # Prisma schema & seed
  tests/e2e/              # Vitest E2E test suite (41 tests)
artifacts/api-server/     # Shared Express API server (scaffold)
```

## Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (config only)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (config only)
- `AUTH_SECRET` — Session HMAC signing secret

## Running the App
The app runs via the `artifacts/academia: web` workflow:
```
pnpm --filter @workspace/academia run dev
```
Next.js listens on `$PORT` (18373) bound to `0.0.0.0`.

## Auth Architecture
- Auth is entirely cookie-based (`app_session` — HMAC-SHA256 signed, 8h TTL)
- Supabase is **not** used for auth at runtime; retained for DB config/env only
- `src/middleware.ts` enforces route protection at the Next.js edge level
- API routes: `requireSessionUser()` from `src/lib/server/session.ts`
- Page server components: `requirePageSessionUser()` for server-side checks

## API Conventions
- All responses: `apiSuccess(data, requestId)` or `apiError(code, msg, requestId, details, status)` from `src/lib/server/api.ts`
- Errors caught by `handleApiError(error, requestId, context)`
- All DB access uses `db` export from `src/lib/db.ts` (canonical PrismaClient alias)
- `prisma` export in same file is legacy — new code always uses `db`
- Zod schemas for all request validation: `src/schemas/index.ts`

## Client-side Conventions
- All API calls go through `apiClient` from `src/lib/api.ts`
- All data fetching uses TanStack Query hooks from `src/lib/client/hooks.ts`
- Single canonical UI component tree: `src/components/ui/` (never `src/app/components/ui/`)
- `QueryClient` is instantiated once per session via `useState` in `src/app/providers.tsx`

## RBAC
- Two built-in roles: `admin` (school-wide) and `faculty` (class-scoped)
- Extended RBAC with custom roles, permissions, and custom features: `src/lib/rbac/`
- Custom feature assignments: `POST /api/rbac/custom-features/assign` (admin-only)

## Security
- `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` via `next.config.js`
- All destructive UI actions use `AlertDialog` (no `window.confirm`)
- Mutation-only API routes return `405 Method Not Allowed` with `Allow` header for GET
- All `catch` blocks suppress noisy `console.error` leakage — errors surface via toast only

## Testing
- 41 E2E tests in `tests/e2e/` run via `npx vitest run tests/e2e/`
- 6 test files: audit-logs, custom-features, department-scope, rls-validation, role-permissions, tenant-isolation

## Audit: Dead Code Removed
- `src/app/components/ui/` — duplicate component tree (shadcn copies)
- `src/components/route-protected.tsx` — HOC never used in any page
- `src/components/permission-guard.tsx` — guard components unused in pages
- `src/lib/rbac/menu-integration.tsx` — dead RBAC menu wrapper
- `src/lib/rbac/menu-visibility.ts` — dead companion file
- `src/app/admin/logspage.tsx` — stale duplicate of logs/page.tsx
- `src/app/hooks/` directory — useAutoSave, useMarksStats, useMarksValidation, useMarksSync (none imported)
- UI components never used: calendar, carousel, chart, drawer, input-otp, resizable
- `src/proxy.ts` — misnamed middleware (real middleware is `src/middleware.ts`)
- `src/lib/rbac/PHASE_3_EXAMPLES.ts`, `src/lib/rbac/SECURITY_TESTS.test.ts`

## Audit: Packages Removed
Removed 13 unused runtime packages and 2 dev packages:
- `@supabase/auth-helpers-nextjs` (deprecated, replaced by @supabase/ssr)
- `canvas-confetti`, `embla-carousel-react`, `react-dnd`, `react-dnd-html5-backend`
- `react-responsive-masonry`, `recharts`, `react-popper`, `@popperjs/core`
- `next-themes`, `motion`, `vaul`, `input-otp`, `react-resizable-panels`, `react-day-picker`
- `lodash` + `@types/lodash`
