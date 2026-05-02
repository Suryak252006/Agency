# Academia — School ERP SaaS

## Project Overview
Multi-tenant K-12 School ERP SaaS for Indian schools. Built on Next.js 15 App Router. One Replit PostgreSQL database shared across all tenants; tenant isolation is enforced at the query layer via `tenantDb()`.

## Architecture

### Stack
- **Framework**: Next.js 15 (App Router, Server Components)
- **Database**: PostgreSQL via Prisma 5 ORM
- **Auth**: HMAC-SHA256 session cookies (`AUTH_SECRET`) — no Supabase auth
- **UI**: shadcn/ui + Tailwind CSS
- **API state**: TanStack Query v5
- **Validation**: Zod

### Key Directories
```
artifacts/academia/
├── prisma/
│   └── schema.prisma          # Full multi-tenant schema
├── src/
│   ├── app/
│   │   ├── admin/             # Admin portal pages
│   │   ├── faculty/           # Faculty portal pages
│   │   ├── parent/            # Parent portal pages (Sprint 2+)
│   │   └── api/               # API route handlers
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── db-tenant.ts       # tenantDb() — auto-injects schoolId in WHERE/data
│   │   ├── auth/
│   │   │   └── session-cookie.ts  # HMAC cookie sign/verify
│   │   ├── server/
│   │   │   ├── session.ts     # requireSessionUser, requirePageSessionUser
│   │   │   ├── marks.ts       # Business logic: marks, lock workflow
│   │   │   └── requests.ts    # Business logic: edit/access requests
│   │   ├── rbac/
│   │   │   └── middleware.ts  # RBAC decorators (withPermission, withRole, etc.)
│   │   └── supabase/
│   │       └── middleware.ts  # Next.js middleware (auth redirect logic)
│   ├── modules/
│   │   ├── academic/classes/http.ts
│   │   ├── workflow/audit-logs/service.ts
│   │   └── workflow/requests/http.ts
│   └── schemas/               # Zod schemas shared between client and server
└── tests/
    └── e2e/
        ├── setup.ts            # Global fixtures (Tenant + User seeds)
        └── *.test.ts           # Playwright E2E tests
```

## Multi-Tenancy Design

### Tenant Model
Every school is a `Tenant` record. `schoolId` on every tenant-scoped model is a FK to `Tenant.id`. Tenant IDs are used directly as `schoolId` values (e.g., `schl_xyz`).

### `tenantDb()` Helper (`src/lib/db-tenant.ts`)
```typescript
const tdb = tenantDb(user.schoolId);
// All findMany, findFirst, count → auto-inject WHERE schoolId = user.schoolId
// All create → auto-inject data.schoolId = user.schoolId (runtime defense)
// All updateMany, deleteMany → auto-inject WHERE schoolId = user.schoolId
// findUnique, update → NOT intercepted; use findFirst/updateMany instead
```

**Usage pattern** in every API route:
```typescript
const user = await requireSessionUser();
const tdb = tenantDb(user.schoolId);
const classes = await tdb.class.findMany({ where: { grade: '10' } });
// → SELECT * FROM "Class" WHERE "schoolId" = user.schoolId AND "grade" = '10'
```

**Do NOT use `tdb` for** (no schoolId column):
- `classStudent` (scope via `class.schoolId` nested filter)
- `marksHistory` (scope via `marksId` FK)
- `rolePermission` (global, no schoolId)
- `permission` (global, no schoolId)

**Keep `db` for**:
- `db.marks.upsert(...)` — explicit schoolId in `create` clause
- `db.request.update(...)` — ownership verified by prior `tdb.request.findFirst()`
- `db.user.findUnique({ where: { email } })` — login, cross-tenant auth lookup

## Authentication

### Session Cookie
- Cookie name: `app_session`
- Format: `base64url(JSON payload).HMAC-SHA256-signature`
- TTL: 8 hours (hard expiry enforced server-side)
- Secret: `AUTH_SECRET` environment variable

### Session Roles (AppSessionRole)
| DB UserRole   | Session Role | Portal       |
|---------------|--------------|--------------|
| ADMIN         | `admin`      | `/admin`     |
| PRINCIPAL     | `admin`      | `/admin`     |
| ACCOUNTANT    | `admin`      | `/admin`     |
| FACULTY       | `faculty`    | `/faculty`   |
| PARENT        | `parent`     | `/parent`    |

### Login Flow
`POST /api/auth/login` → validates credentials → maps DB role to session role → sets HMAC cookie → responds with `{ redirectTo }`.

## Database Schema (Sprint 1)

### New models (Sprint 1)
- **Tenant**: SaaS root — slug, name, board, subscriptionTier/Status, settings JSON
- **SchoolConfig**: Per-tenant config — gradingSystem, workingDays, timezone, colors

### Extended models (Sprint 1)
- **User**: added `phone`, `isActive`, `lastLoginAt`, `avatarUrl`, FK to Tenant
- **UserRole enum**: added `PRINCIPAL`, `ACCOUNTANT`, `PARENT`

### New enums (Sprint 1)
- `SubscriptionTier`: FREE, STARTER, PROFESSIONAL, ENTERPRISE
- `SubscriptionStatus`: TRIAL, ACTIVE, SUSPENDED, CHURNED
- `SchoolBoard`: CBSE, ICSE, STATE_BOARD, OTHER

## Marks Lock Workflow
```
Faculty enters marks → SUBMITTED
Faculty requests lock → LOCK_PENDING
Admin/HOD approves → LOCKED
Admin/HOD rejects → SUBMITTED (editable again)
Faculty submits edit request → EDIT_MARKS request (for LOCKED marks)
```

## E2E Test Fixtures
Test schools: `schl_a_test`, `schl_b_test`
Test password: `TestPass123!`

Fixture setup order (important for FK constraints):
1. Tenant records (must exist before User)
2. Users
3. Faculty records
4. Departments (with headId)
5. FacultyDepartment links

## Environment Variables
| Variable                      | Purpose                          |
|-------------------------------|----------------------------------|
| `DATABASE_URL`                | PostgreSQL connection string     |
| `AUTH_SECRET`                 | HMAC-SHA256 session signing key  |
| `NEXT_PUBLIC_SUPABASE_URL`    | Legacy (kept for compatibility)  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Legacy (kept for compatibility)|

## Sprint History

### Sprint 1 — Multi-tenant foundation (current)
- Added Tenant + SchoolConfig models to schema
- Extended UserRole with PRINCIPAL, ACCOUNTANT, PARENT
- Added User fields: phone, isActive, lastLoginAt, avatarUrl
- Replaced Supabase auth with pure HMAC-SHA256 cookie auth
- Built `tenantDb()` Prisma extension for automatic schoolId scoping
- Updated all API routes and server libs to use tenantDb
- Updated login route to handle all UserRole values + isActive check + lastLoginAt
- Fixed RBAC middleware checkSuperAdminMiddleware to scope by schoolId
- Updated E2E test setup to create Tenant fixtures before User records
- Applied schema via `prisma db push` (DB was previously unmanaged by Migrate)
