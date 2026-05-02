# Academia — School Academic Management System

## Overview
A Next.js 15 school academic management platform using Supabase for auth/database and Prisma as ORM. Features role-based access control (RBAC) for administrators and faculty, with dashboards, marks management, class scheduling, and exam tracking.

## Tech Stack
- **Framework**: Next.js 15 (App Router) — kept as-is from original Vercel project
- **Auth & DB**: Supabase (auth + PostgreSQL)
- **ORM**: Prisma
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI + shadcn/ui, MUI
- **State**: TanStack React Query
- **Runtime**: Node.js

## Project Structure
```
artifacts/academia/       # Main Next.js app
  src/
    app/                  # Next.js App Router pages
      admin/              # Admin dashboard
      faculty/            # Faculty portal
      auth/               # Auth pages
      api/                # API routes (Next.js route handlers)
    components/           # Shared UI components
    lib/
      supabase/           # Supabase client config
      server/             # Server-side utilities (session, etc.)
  prisma/                 # Prisma schema & migrations
artifacts/api-server/     # Shared Express API server (scaffold, minimal use)
```

## Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/publishable key
- `AUTH_SECRET` — Session signing secret

## Running the App
The app runs via the `artifacts/academia: web` workflow using:
```
pnpm --filter @workspace/academia run dev
```
Next.js listens on `$PORT` (18373) bound to `0.0.0.0`.

## Auth Architecture
- Auth is entirely cookie-based (`app_session` — HMAC-SHA256 signed JWT, 8h TTL)
- Supabase is **not** used for auth at runtime; it's retained only for historical compatibility
- `src/middleware.ts` enforces route protection at the Next.js edge level (redirects unauthenticated users, role-wrong users)
- API routes use `requireSessionUser()` from `src/lib/server/session.ts`
- Page server components use `requirePageSessionUser()` for server-side session checks

## API Conventions
- All responses use `apiSuccess(data, requestId)` or `apiError(code, msg, requestId, details, status)` from `src/lib/server/api.ts`
- Errors are always caught by `handleApiError(error, requestId, context)`
- All DB access uses the `db` export from `src/lib/db.ts` (canonical alias for PrismaClient)
- `prisma` export from the same file is the legacy name — new code always uses `db`
- Zod schemas for all request validation live in `src/schemas/index.ts`

## RBAC
- Two built-in roles: `admin` (school-wide) and `faculty` (class-scoped)
- Extended RBAC with custom roles, permissions, and custom features lives in `src/lib/rbac/`
- Custom feature assignments via `POST /api/rbac/custom-features/assign` (admin-only)

## Security Headers
- `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` set via `next.config.js`

## Testing
- 41 E2E tests in `tests/e2e/` run via `npx vitest run tests/e2e/`
- 6 test files: audit-logs, custom-features, department-scope, rls-validation, role-permissions, tenant-isolation

## Notes
- Original Next.js stack preserved — no migration to Vite/React
- `NEXT_PUBLIC_*` env vars are Supabase credentials, not database URLs
- Prisma client is generated from `artifacts/academia/prisma/schema.prisma`
- `src/proxy.ts` was deleted (it was a misnamed middleware — `src/middleware.ts` is the correct file)
- Dead code removed: `src/lib/rbac/PHASE_3_EXAMPLES.ts`, `src/lib/rbac/SECURITY_TESTS.test.ts`
