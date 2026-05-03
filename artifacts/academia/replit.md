# Academia — School ERP SaaS

## Project Overview
Multi-tenant K-12 School ERP SaaS for Indian schools. Built on Next.js 15 App Router. One Replit PostgreSQL database shared across all tenants; tenant isolation is enforced at the query layer via `tenantDb()`.

## Architecture

### Stack
- **Framework**: Next.js 15 (App Router, Server Components)
- **Database**: PostgreSQL via Prisma 5 ORM (M04 schema — 34 models, 14 enums)
- **Auth**: HMAC-SHA256 session cookies (`AUTH_SECRET`) — no Supabase auth
- **UI**: shadcn/ui + Tailwind CSS
- **API state**: TanStack Query v5
- **Validation**: Zod

### Key Directories
```
artifacts/academia/
├── prisma/
│   └── schema.prisma          # Full multi-tenant schema (M04)
├── src/
│   ├── app/
│   │   ├── (portals)/
│   │   │   ├── admin/         # Admin portal pages
│   │   │   ├── faculty/       # Faculty portal pages
│   │   │   └── parent/        # Parent portal pages
│   │   └── api/
│   │       ├── v1/            # All new versioned API routes
│   │       └── ...            # Legacy unversioned routes (kept for tests)
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── db-tenant.ts       # tenantDb() — auto-injects schoolId
│   │   ├── auth/
│   │   │   └── session-cookie.ts  # HMAC cookie sign/verify
│   │   ├── server/
│   │   │   ├── session.ts     # requireSessionUser, requirePageSessionUser
│   │   │   ├── marks.ts       # Business logic: marks, lock workflow
│   │   │   └── requests.ts    # Business logic: edit/access requests
│   │   ├── rbac/
│   │   │   └── middleware.ts  # RBAC decorators
│   │   └── client/
│   │       └── hooks.ts       # useClasses, useGrades, useAcademicYears, etc.
│   ├── modules/
│   │   ├── academic/classes/http.ts
│   │   ├── workflow/audit-logs/service.ts
│   │   └── workflow/requests/http.ts
│   └── schemas/               # Zod schemas (M04-aligned enum values)
└── tests/
    ├── e2e/                   # 10 test files, 92 passing
    └── unit/
```

## Multi-Tenancy Design

### `tenantDb()` Helper (`src/lib/db-tenant.ts`)
```typescript
const tdb = tenantDb(user.schoolId);
// All findMany, findFirst, count → auto-inject WHERE schoolId = user.schoolId
// All create → auto-inject data.schoolId = user.schoolId
// All updateMany, deleteMany → auto-inject WHERE schoolId = user.schoolId
// findUnique, update → NOT intercepted; verify schoolId manually
```

**Do NOT use `tdb` for** (no schoolId column):
- `classStudent`, `marksHistory`, `rolePermission`, `permission`, `facultyDepartment`

## Authentication

### Session Cookie
- Cookie name: `app_session`
- Format: `base64url(JSON payload).HMAC-SHA256-signature`
- TTL: 8 hours (hard expiry enforced server-side)
- Secret: `AUTH_SECRET` environment variable

### Session Roles
| DB UserRole   | Session Role | Portal       |
|---------------|--------------|--------------|
| ADMIN         | `admin`      | `/admin`     |
| PRINCIPAL     | `admin`      | `/admin`     |
| ACCOUNTANT    | `admin`      | `/admin`     |
| FACULTY       | `faculty`    | `/faculty`   |
| PARENT        | `parent`     | `/parent`    |

## Critical Schema Notes (M04)

### Correct enum values
- `AttendanceStatus`: PRESENT, ABSENT, LATE, **MEDICAL_LEAVE** (not EXCUSED)
- `FeeFrequency`: ONE_TIME, MONTHLY, QUARTERLY, HALF_YEARLY, **ANNUAL** (not ANNUALLY)
- `PaymentMode`: **CASH, CHEQUE, NEFT, UPI, DEMAND_DRAFT**
- `NoticeType`: ACADEMIC, FEE (+ more)
- `NoticeAudience`: ALL, PARENTS, STAFF, **ADMIN_ONLY, SPECIFIC_GRADES**
- `ReportTemplate`: **CBSE_10_POINT**, PERCENTAGE, GRADE_ONLY, CUSTOM
- `MarksStatus`: SUBMITTED, LOCK_PENDING, LOCKED, REJECTED

### Critical field names
- `Parent`: `fatherName`, `motherName`, `guardianName`, `primaryPhone` (NO `name` field)
- `Notice`: `body` (not `content`), `targetAudience` (not `audience`), `publishedAt` (not `publishAt`)
- `FeeCollection`: `paymentMode` (not `mode`), `receiptDate` (not `paidAt`), `notes` (not `note`)
- `ReportCardConfig`: requires `termId` + `gradeId`; includes `showAttendance`, `showRemarks`
- `Class`: `grade` and `section` are scalar Int/String; relations are `gradeRef`/`sectionRef`
- `ClassStudent`: junction with `classId`, `studentId`, `enrolledAt`; Student has `classes ClassStudent[]`
- `AttendanceRecord`: `remark` (not `note`); no `markedById`
- `Exam`: has `departmentId` (required), NO `terms` relation
- `FacultyDepartment`: unique on `{facultyId, departmentId}`

## API Routes (v1) — 61 routes total

### Auth & School
- `GET/PATCH /api/v1/school`, `GET/PATCH /api/v1/school/config`

### Academic Structure
- Academic years CRUD + `/set-current` + `/lock` + terms sub-resource
- Grades, Sections, Subjects CRUD
- Classes CRUD + `/students` sub-resource

### People
- Students CRUD + `/attendance` + `/marks` + `/fees` + `/transfer-out`
- Parents CRUD + `/students` + `/me`
- Faculty CRUD + department assignment
- Departments CRUD

### Academic Operations
- Attendance sessions CRUD + `/records`
- Exams CRUD
- Marks: POST bulk, GET status, GET submissions
- Report cards config

### Fees
- Categories CRUD
- Structure CRUD
- Collection CRUD + `/void`
- `/fees/summary`, `/fees/dues`

### Parent Portal
- `/parent/children`, `/parent/children/[id]/attendance|fees|marks`

### Other
- Notices CRUD + `/publish` + `/feed`
- Requests CRUD
- Roles, Custom features
- Audit logs

## Portal Pages

### Admin Portal (24 pages)
Dashboard, Classes, Students (list + profile tabs), Parents, Faculty, Departments, Attendance, Exams, Fees (overview/structure/collection/dues), Notices, Report Cards, Academic Years, Grades & Subjects, Requests, Logs, School Setup, RBAC Roles/Custom Features

### Faculty Portal (6 pages)
Dashboard, Classes, Attendance (mark sessions), Marks (entry grid), Requests, Notices

### Parent Portal (7 pages)
Dashboard, Attendance, Marks, Fees, Report Cards, Notices, Profile

## Marks Lock Workflow
```
Faculty enters marks → SUBMITTED
Faculty requests lock → LOCK_PENDING
Admin/HOD approves → LOCKED
Admin/HOD rejects → SUBMITTED (editable again)
Faculty submits edit request → EDIT_MARKS request (for LOCKED marks)
```

## Test Suite
- **10 test files, 92 passing, 1 skipped** (93 total)
- E2E tests: academic-structure, auth-parent, audit-logs, custom-features,
  department-scope, rbac-clone-isolation, rls-validation, role-permissions, tenant-isolation
- Unit tests: tenant-scoped-models

## E2E Test Fixtures
Test schools: `schl_a_test`, `schl_b_test` | Password: `TestPass123!`

## Environment Variables
| Variable                        | Purpose                          |
|---------------------------------|----------------------------------|
| `DATABASE_URL`                  | PostgreSQL connection string     |
| `AUTH_SECRET`                   | HMAC-SHA256 session signing key  |
| `NEXT_PUBLIC_SUPABASE_URL`      | Legacy (kept for compatibility)  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Legacy (kept for compatibility)  |

## Sprint History

### Sprint 1 — Multi-tenant foundation
- Tenant + SchoolConfig models; extended UserRole/User; HMAC cookie auth
- `tenantDb()` Prisma extension; all API routes updated

### Sprint 2 — Academic structure (M03)
- AcademicYear, Term, Grade, Section, Subject models
- Full CRUD API routes; academic-years/grades/setup UI pages

### Phases 3–4 — M04 schema + full API surface
- 34 models, 14 enums pushed to DB via `prisma db push`
- All Zod schemas corrected to M04 enum values
- 61 v1 API routes covering all ERP domains
- Admin portal: faculty, departments, student profile, exams, fees/dues
- Faculty portal: marks entry grid (class + exam selector)
- Parent portal: report cards, profile, correct marks/attendance/fees endpoints
