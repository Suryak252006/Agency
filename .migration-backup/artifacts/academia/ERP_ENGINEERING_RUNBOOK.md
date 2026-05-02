# School ERP — Engineering Runbook

> **Purpose:** Companion to `ERP_IMPLEMENTATION_SPEC.md`. Does not repeat the spec.
> Contains the 8 execution artifacts an engineering team needs to start work on day one:
> glossary, NFRs, deployment plan, seed data, UI component map, Prisma sequence,
> Sprint 1–2 task breakdown, and QA checklists.
>
> **Source of truth:** `ERP_IMPLEMENTATION_SPEC.md` — all entity names, route paths,
> field names, and role identifiers in this document match that spec exactly.

---

## 1. Data Glossary

Precise definitions for every domain term used in code, APIs, and UI copy.
When a term appears in a variable name, DB column, or UI label, it means exactly what is written here.

### School / Tenant Layer

| Term | Definition | DB Field / Model |
|---|---|---|
| **Tenant** | A school as a SaaS customer. The root of all data isolation. Every record in the system belongs to exactly one Tenant via `schoolId`. | `Tenant.id` |
| **schoolId** | The cuid primary key of the `Tenant` record. Used as the foreign key on every tenant-scoped model. Never a human-readable slug. | All [T] models |
| **slug** | URL-safe, lowercase, hyphenated identifier for a school. Example: `"dav-nashik"`. Set at onboarding, never changed. | `Tenant.slug` |
| **SchoolConfig** | A 1:1 record holding every school-level preference: grading system, academic year start month, fee settings, notification toggles, branding colors. | `SchoolConfig` |
| **subscriptionTier** | The pricing plan: FREE, STARTER, PROFESSIONAL, or ENTERPRISE. Determines feature gates (not yet enforced in v1, but modeled). | `Tenant.subscriptionTier` |
| **subscriptionStatus** | The billing state: TRIAL, ACTIVE, SUSPENDED, or CHURNED. SUSPENDED = access blocked. CHURNED = ex-customer, data retained 90 days. | `Tenant.subscriptionStatus` |
| **trialEndsAt** | DateTime when a new school's free trial expires. After this date, middleware redirects to a payment/contact page. | `Tenant.trialEndsAt` |
| **isActive** | Boolean flag for soft-disabling a Tenant without data loss. `isActive=false` = same as SUSPENDED but triggered manually. | `Tenant.isActive` |

### Academic Calendar

| Term | Definition | DB Field / Model |
|---|---|---|
| **AcademicYear** | A named 12-month academic period, typically April 1 → March 31 for Indian schools. Name format: `"2024-25"`. All marks, attendance, and fees belong to an AcademicYear. | `AcademicYear` |
| **isCurrent** | Boolean flag. Exactly one AcademicYear per school has `isCurrent=true` at any time. Enforced in application layer via transaction. Controls which year is shown by default everywhere. | `AcademicYear.isCurrent` |
| **isLocked** (AcademicYear) | When `true`, no further edits to marks, attendance, or fee records in this year are allowed. Set during year-end close. | `AcademicYear.isLocked` |
| **Term** | A named subdivision of an AcademicYear used for exams and report cards. CBSE primary uses FA1, FA2, SA1, SA2. CBSE secondary uses Term 1, Term 2. Each term has an `order` (1–4) and a `weightage` percentage. | `Term` |
| **examType** | The classification of a Term: FORMATIVE (FA1, FA2), SUMMATIVE (SA1, SA2), QUARTERLY, HALF_YEARLY, or ANNUAL. Drives grading rules. | `Term.examType` |
| **weightage** | The percentage contribution of a Term to the final annual grade. Example: FA1=20, FA2=20, SA1=30, SA2=30. Must sum to 100 across terms. | `Term.weightage` |
| **isPublished** (Term) | When `true`, parents can see marks and report cards for this term via their portal. Set by Admin after all marks are LOCKED. | `Term.isPublished` |

### School Structure

| Term | Definition | DB Field / Model |
|---|---|---|
| **Grade** | An academic standard: Nursery, KG, Class 1 through Class 12. Stored with a `level` integer (0=Nursery, 1–12=Class 1–12) for sorting. Not called "Class" to avoid naming conflict with the `Class` model. | `Grade` |
| **Section** | A named division within a Grade. Examples: A, B, C, D, Lotus, Rose. Created per school — different schools use different names. | `Section` |
| **Subject** | An academic subject: Mathematics, Hindi, EVS, Physics. Has a `subjectType`: MAIN, OPTIONAL, CO_CURRICULAR, or LANGUAGE. | `Subject` |
| **Department** | A faculty grouping: Science, Arts, Commerce, Humanities. HOD is assigned per Department. Subjects and Classes are linked to Departments for secondary grades. | `Department` |
| **Class** | The atomic teaching unit: one Grade + one Section + one Subject + one AcademicYear + one Faculty. Example: "Class 10-A Mathematics 2024-25". The `Class` is what a teacher is assigned to and what students are enrolled in. | `Class` |
| **classTeacherId** | The Faculty assigned as the class teacher for this Class. Responsible for attendance marking and class-level report card remarks. | `Class.classTeacherId` (via Faculty FK) |

### People

| Term | Definition | DB Field / Model |
|---|---|---|
| **User** | A system login account. Every human who logs in (admin, faculty, parent) has a User record. `role` determines which portal they land on after login. | `User` |
| **Faculty** | A staff member who teaches. Has a 1:1 link to a User account. May belong to multiple Departments. May be assigned to multiple Classes. | `Faculty` |
| **Student** | A learner enrolled in the school. Has a full SIS profile. Does NOT have a User account in v1. Accessed by parents and teachers on their behalf. | `Student` |
| **admissionNo** | A school-specific, human-readable, sequential identifier for a student. Format: `ADM-{YYYY}-{SEQ:4d}`. Example: `ADM-2024-0047`. Generated server-side. Never user-supplied. | `Student.admissionNo` |
| **Parent** | A guardian record: father, mother, or other guardian. May have a User account for portal access. Linked to one or more Students via `ParentStudent`. | `Parent` |
| **ParentStudent** | The join record between a Parent and a Student. Stores the `relation` (FATHER, MOTHER, GUARDIAN) and `isPrimary` flag (which parent is the primary contact). | `ParentStudent` |
| **isPrimary** (ParentStudent) | Exactly one `ParentStudent` record per student has `isPrimary=true`. This is the parent who receives notifications. | `ParentStudent.isPrimary` |
| **primaryPhone** | The WhatsApp-capable mobile number of the primary parent. Used for SMS/WhatsApp alerts in v2. Must be a valid 10-digit Indian number. | `Parent.primaryPhone` |
| **isActive** (Student) | `false` means the student has been transferred out (TC issued). Their historical records are retained. They no longer appear in active class lists. | `Student.isActive` |
| **category** | Indian government classification for students: GENERAL, OBC, SC, ST, EWS. Required for regulatory reporting in Indian schools. | `Student.category` |

### Attendance

| Term | Definition | DB Field / Model |
|---|---|---|
| **AttendanceSession** | One attendance-taking event for one Class on one date. Created by the class teacher. Has a `isFinalized` flag — once true, records cannot be edited without an approved correction request. | `AttendanceSession` |
| **AttendanceRecord** | One row per student per AttendanceSession. Status is PRESENT, ABSENT, LATE, HALF_DAY, HOLIDAY, or MEDICAL_LEAVE. | `AttendanceRecord` |
| **isFinalized** | When `true` on an AttendanceSession, the teacher has submitted that day's attendance. No further edits allowed without a HOD/Admin override via the Request workflow. | `AttendanceSession.isFinalized` |
| **attendance %** | `(present days / total school days in term) × 100`. The 75% threshold (configurable in SchoolConfig) triggers a warning flag on the student's profile. | Computed field |

### Marks & Exams

| Term | Definition | DB Field / Model |
|---|---|---|
| **Exam** | A specific assessment event within a Term for a Class. Has `maxMarks`, `startDate`, `endDate`. Belongs to a Department and optionally scoped to one Class. | `Exam` |
| **Marks** | A single mark value for one student in one Exam. Value is a string: `"75"` (numeric), `"AB"` (absent), or `"NA"` (not applicable). | `Marks` |
| **MarksStatus** | The lifecycle state of a Marks record: SUBMITTED (editable), LOCK_PENDING (teacher requested lock, awaiting approval), LOCKED (immutable). | `Marks.status` |
| **SUBMITTED** | Marks have been entered by the teacher. Fully editable. Not visible to parents. | `MarksStatus.SUBMITTED` |
| **LOCK_PENDING** | Teacher has clicked "Request Lock". Awaiting Admin or HOD approval. Not editable by teacher. Not visible to parents. | `MarksStatus.LOCK_PENDING` |
| **LOCKED** | Admin or HOD has approved the lock. Marks are final. Visible to parents. Cannot be changed except by SUPER_ADMIN with explicit audit trail. | `MarksStatus.LOCKED` |
| **MarksHistory** | An immutable log of every change to a Marks record. Stores previous value, who changed it, and when. Never deleted. | `MarksHistory` |

### Report Cards

| Term | Definition | DB Field / Model |
|---|---|---|
| **ReportCardConfig** | The template settings for generating report cards for one Grade in one Term: which grading system, which fields to show. One config per Grade per Term. | `ReportCardConfig` |
| **ReportCard** | The generated academic summary for one Student for one Term. Contains aggregated marks, calculated grade, class rank, attendance summary, teacher remarks, and a link to the PDF. | `ReportCard` |
| **isPublished** (ReportCardConfig) | When `true`, parents with students in this Grade can download their child's report card PDF. Controlled by Admin after reviewing all generated cards. | `ReportCardConfig.isPublished` |
| **pdfKey** | The `FileAsset` storage key pointing to the generated report card PDF. Used to construct a signed download URL. | `ReportCard.pdfKey` |
| **GradingSystem** | How marks are converted to grades. TEN_POINT = CBSE (A1=91-100, A2=81-90, B1=71-80...). PERCENTAGE = ICSE (raw percentage shown). LETTER = A/B/C/D/F. Set in SchoolConfig. | `SchoolConfig.gradingSystem` |

### Fee Management

| Term | Definition | DB Field / Model |
|---|---|---|
| **FeeCategory** | A named type of fee: Tuition Fee, Transport Fee, Activity Fee, Development Fee. Has a unique `code` per school. | `FeeCategory` |
| **FeeStructure** | The amount and frequency for one FeeCategory for one Grade in one AcademicYear. Example: Class 10, Tuition Fee, ₹8,000/month. | `FeeStructure` |
| **FeeInstallment** | A single scheduled payment obligation for one student. Generated in bulk from FeeStructure at year start. Has a `dueDate`, `amount`, and `status`. | `FeeInstallment` |
| **InstallmentStatus** | Lifecycle of a FeeInstallment: PENDING, PAID, OVERDUE (past dueDate and unpaid), WAIVED (concession applied), PARTIAL (partially paid). | `FeeInstallment.status` |
| **StudentFeeAccount** | A running ledger for one student in one AcademicYear. Stores `totalAmount`, `totalPaid`, `totalDue`, and `concession`. Updated atomically on every payment. | `StudentFeeAccount` |
| **concession** | A monetary discount applied to a student's StudentFeeAccount. Causes affected FeeInstallments to be regenerated. Requires `fees.grant_concession` permission — Accountant cannot grant this. | `StudentFeeAccount.concession` |
| **FeeCollection** | A payment transaction. Created when the accountant collects money. Anchors one or more installment payments. Generates a receipt. Immutable once created — voiding creates a counter-record, never a deletion. | `FeeCollection` |
| **receiptNo** | A sequential, gapless, human-readable receipt identifier. Format: `RCP-2024-00001`. Generated via `ReceiptSequence` with `SELECT FOR UPDATE`. | `FeeCollection.receiptNo` |
| **ReceiptSequence** | A single row per school per year that holds `lastSeq`. Incremented atomically inside a DB transaction to guarantee no gaps or duplicates. | `ReceiptSequence` |
| **paymentMode** | How the payment was made: CASH, CHEQUE, NEFT, UPI, or DEMAND_DRAFT. Determines which additional fields (chequeNo, bankName, transactionRef) are required. | `FeeCollection.paymentMode` |
| **isVoided** | A voided receipt is one that was cancelled after collection (e.g., cheque bounce). The original FeeCollection record is never deleted — `isVoided=true` is set and a `voidReason` is required. Only SCHOOL_ADMIN can void. | `FeeCollection.isVoided` |

### Notices & Communication

| Term | Definition | DB Field / Model |
|---|---|---|
| **Notice** | A school announcement. Has a `type` (ACADEMIC, EXAM, FEE, EVENT, HOLIDAY, GENERAL), a `targetAudience`, and an optional expiry date. Exists as a draft until published. | `Notice` |
| **targetAudience** | Who sees a Notice: ALL, ADMIN_ONLY, FACULTY, PARENTS, STUDENTS, or SPECIFIC_GRADES. When SPECIFIC_GRADES, the `gradeIds` array determines which parents see it. | `Notice.targetAudience` |
| **NotificationLog** | A delivery record for one notification sent via one channel to one recipient. Used for delivery tracking and retry logic. Never queried by end users — internal audit trail only. | `NotificationLog` |
| **channel** | The delivery mechanism for a notification: EMAIL, SMS, WHATSAPP (v2), or IN_APP. v1 supports EMAIL and IN_APP only. | `NotificationLog.channel` |

### RBAC

| Term | Definition | DB Field / Model |
|---|---|---|
| **Role** | A named permission bundle assigned to users. Can be a system role (SUPER_ADMIN, SCHOOL_ADMIN, PRINCIPAL, ACCOUNTANT, HOD, CLASS_TEACHER, SUBJECT_TEACHER, PARENT) or a custom role. | `Role` |
| **Permission** | A single capability key. Format: `module.action`. Example: `fees.collect`, `marks.approve_lock`. Permissions are global (not per school). | `Permission` |
| **RoleAssignment** | The record linking a User to a Role within a school. May optionally be scoped to a Department. | `RoleAssignment` |
| **CustomFeature** | A school-specific feature flag that can be toggled on for specific roles or users. Exists in the current codebase — not changed by ERP work. | `CustomFeature` |
| **scope** (permission) | The boundary within which a permission applies. GLOBAL = across all schools (SUPER_ADMIN only). SCHOOL = all data within one school. DEPARTMENT = only data in the user's assigned departments. | `PermissionScope` |

### System / Operations

| Term | Definition | DB Field / Model |
|---|---|---|
| **JobQueue** | A DB-backed queue for async work: PDF batch generation, bulk fee installment creation, bulk email sending. Polled by a cron endpoint. Has `status`: PENDING, RUNNING, DONE, FAILED. | `JobQueue` |
| **AuditLog** | An immutable append-only record of every significant write action in the system. Never updated or deleted. Used for compliance and debugging. | `AuditLog` |
| **RBACLog** | A separate immutable log specifically for role and permission changes. Similar to AuditLog but focused on access control actions. | `RBACLog` |
| **FileAsset** | A record tracking an uploaded file: its storage key, bucket, MIME type, size, and status. The actual binary is in object storage (Supabase Storage or Replit Object Storage). | `FileAsset` |
| **tenantDb()** | A TypeScript helper that wraps Prisma queries to automatically inject `schoolId` into every `where` clause. Must be used for all data access in API route handlers. | `lib/db-tenant.ts` |

---

## 2. Non-Functional Requirements

All targets are measurable, testable, and aligned to the Indian school context (unreliable mobile networks, 2G/3G common for parents, school offices on low-end desktops).

### 2.1 Performance

| Requirement | Target | Measurement method | When to test |
|---|---|---|---|
| API response time (p50) | < 150ms | Load test with k6, median latency | Before M3 Attendance |
| API response time (p95) | < 500ms | Load test with k6, 95th percentile | Before M3 Attendance |
| API response time (p99) | < 1,500ms | Load test with k6, 99th percentile | Before production |
| Attendance bulk save (60 students) | < 300ms end-to-end | Measure POST /attendance/session/[id]/records | M3 QA |
| Fee collection transaction | < 800ms end-to-end | Measure POST /fees/collect including receipt generation | M5 QA |
| Concurrent attendance sessions | 50 simultaneous class teachers, no timeouts | k6 with 50 VUs hitting the attendance endpoint | M8 load test |
| Concurrent receipt generation | 10 simultaneous collections, 0 duplicate receiptNos | k6 with 10 VUs + DB uniqueness constraint validation | M8 load test |
| Fee installment generation (500 students) | < 5 seconds | Measure the createMany() batch job | M5 QA |
| Report card PDF generation (60 students) | < 90 seconds total for a class | Measure job duration in JobQueue | M4 QA |
| Page load (Time to Interactive, 4G) | < 3 seconds | Lighthouse CI or WebPageTest | Before pilot |
| Page load (Time to Interactive, 3G) | < 6 seconds | WebPageTest with 3G throttle | Before pilot |

### 2.2 Reliability

| Requirement | Target | Notes |
|---|---|---|
| API uptime (SLA) | 99.5% monthly | ≤ 3.6 hours downtime/month. Replit deployment. |
| Database backup frequency | Every 24 hours | Replit managed PostgreSQL backup. Verify restore process before pilot. |
| Recovery Time Objective (RTO) | < 4 hours | From outage detection to service restoration |
| Recovery Point Objective (RPO) | < 24 hours | Maximum data loss on catastrophic failure |
| Zero data loss on fee transactions | 100% | Fee collection uses DB transactions — no partial commits |
| Receipt number uniqueness | 100% | Enforced by `SELECT FOR UPDATE` + DB UNIQUE constraint |
| Marks immutability after LOCK | 100% | LOCKED marks return 403 on any write attempt — tested in QA |
| Tenant data isolation | 100% | Cross-tenant access returns 403 or empty — automated integration test |

### 2.3 Security

| Requirement | Target | Implementation |
|---|---|---|
| Authentication | HMAC-SHA256 signed cookie, 8h TTL | Existing — no change |
| Password storage | bcrypt, minimum cost factor 12 | Existing — no change |
| Session replay protection | `exp` claim in HMAC payload | Existing — no change |
| Tenant isolation | `schoolId` injected via `tenantDb()` on every query | M0 task |
| Cross-tenant access test | Automated integration test must pass before any merge to main | M0 task |
| Rate limiting (auth) | Max 10 login attempts per IP per 5 minutes | M8 (before pilot) |
| Rate limiting (fee collection) | Max 30 requests per minute per school | M8 (before pilot) |
| HTTPS only | All traffic via TLS — Replit enforces this | No action needed |
| CSP / HSTS headers | Already configured in `next.config.js` | No change |
| Secrets in environment | All secrets in Replit secrets manager, never in code | Existing |
| Input sanitization | Zod validation on all API inputs, `@db.Text` fields sanitized before PDF render | Ongoing |
| Parent data access | Server-side ownership check on every `/api/v1/parent/*` route | M6 task |
| Audit trail completeness | All 26 [A]-tagged entities emit AuditLog on every write | Verified in QA |

### 2.4 Scalability

| Requirement | Target | Notes |
|---|---|---|
| Students per school | Up to 2,000 | Covered by current shared-schema model with proper indexing |
| Schools per deployment | Up to 200 | Single PostgreSQL instance at this scale. Move to connection pooling (PgBouncer) at 100+ schools. |
| Concurrent users per school | Up to 100 | 50 teachers + 50 admins/accountants during peak |
| Concurrent parent portal users | Up to 500 | Spike during result publication. PDFs served from object storage — not DB |
| DB query index coverage | All tenant-scoped queries use composite `(schoolId, ...)` index | Verify with `EXPLAIN ANALYZE` before M8 |
| Report card PDF storage | < 500KB per PDF | Enforce in PDF template. 2,000 students × 4 terms = ~4GB/year/school |

### 2.5 Accessibility & Device Support

| Requirement | Target |
|---|---|
| Admin portal (desktop) | Chrome/Firefox/Edge on Windows 10+. Minimum 1280×768 screen. |
| Faculty portal (mobile) | Chrome on Android 8+, Safari on iOS 14+. Must work on 5-inch screens. |
| Parent portal (mobile) | Chrome on Android 8+, Safari on iOS 14+. Must work on 5-inch screens. Must be usable on 2G (< 50 Kbps). |
| Parent portal accessibility | WCAG 2.1 AA for core flows (login, view marks, view fees). Tested with screen reader. |
| Language | English UI throughout v1. Hindi and regional language UI strings in v2. |
| PDF receipts / report cards | Must be printable on A4 paper. Print CSS applied. No truncation on print. |

### 2.6 Observability

| Requirement | Implementation | When |
|---|---|---|
| Structured error logging | `console.error({ requestId, error, route, userId, schoolId })` — never raw error objects | M0 — before any new feature work |
| Request ID tracing | Every request gets a `requestId` (uuid). Included in API response and logs. | M0 |
| Health endpoint | `GET /api/health` returns 200 + `{ status: "ok", db: "connected" }` — already exists | Existing |
| Database query logging | Enable Prisma query logging in dev only (`log: ['query', 'error']`) | M0 |
| Slow query detection | Log any query taking > 200ms with `EXPLAIN ANALYZE` output | M0 |
| Job failure alerting | `JobQueue` jobs with `status=FAILED` and `attempts >= maxAttempts` → log to console (email alert in v2) | M4 |

---

## 3. Deployment and Operations Plan

### 3.1 Environments

| Environment | Purpose | Database | URL pattern | Who accesses it |
|---|---|---|---|---|
| **Development** | Local developer machine | Local PostgreSQL or Replit dev DB | `localhost:3000` | Engineers only |
| **Staging** | Pre-production testing. Mirror of production schema. | Separate PostgreSQL instance | `staging.schoolerp.in` | Engineers + QA + internal demo |
| **Production** | Live system for paying schools | Production PostgreSQL | `app.schoolerp.in` or `{slug}.schoolerp.in` | All users |

**Environment parity rule:** Staging must run the same Prisma migration history as production at all times. Never test a migration only in dev.

### 3.2 Environment Variables

Every environment needs these secrets in the secrets manager. Never in `.env` committed to git.

```
DATABASE_URL              PostgreSQL connection string (Prisma)
AUTH_SECRET               HMAC signing key (32+ char random string — already in Replit secrets)
NEXT_PUBLIC_SUPABASE_URL  Supabase project URL (for file storage) — already in Replit secrets
NEXT_PUBLIC_SUPABASE_ANON_KEY  Supabase anon key — already in Replit secrets
RESEND_API_KEY            Email delivery (Resend.com) — add in M6
SUPER_ADMIN_EMAIL         Bootstrap email for first super admin account — add in M0
```

**Rotation policy:** `AUTH_SECRET` rotation requires all users to re-login. Schedule for off-peak hours. Announce 24h in advance to school admins.

### 3.3 Migration Workflow

Every schema change follows this exact sequence — no exceptions:

```
1. DEVELOP
   pnpm --filter @workspace/academia exec prisma migrate dev --name <description>
   # Creates: prisma/migrations/{timestamp}_{description}/migration.sql
   # Applies to local dev DB automatically

2. REVIEW
   Review the generated migration.sql before committing.
   Check: no accidental DROP TABLE, no NOT NULL without DEFAULT on existing column,
          no missing index for new schoolId FK.

3. TEST ON STAGING
   pnpm --filter @workspace/academia exec prisma migrate deploy
   # Applies all pending migrations to staging DB
   Run full E2E test suite against staging.

4. DEPLOY TO PRODUCTION
   # Done automatically as part of deploy step (see §3.4)
   # prisma migrate deploy runs before the app starts
   # If migration fails → deployment aborts → previous version stays live

5. ROLLBACK (if needed)
   # Prisma does not support automatic rollback.
   # Write a forward-fix migration: add back dropped column, rename back, etc.
   # Never manually edit production DB.
```

**Banned operations:**
- `prisma db push` — never on staging or production
- `prisma migrate reset` — destroys all data
- Manual SQL on production outside of a migration file
- Editing a committed migration file

### 3.4 Deployment Steps

The current app runs on Replit. Deployment process per the `deployment` skill:

```
Pre-deploy checklist (from GO_LIVE_CHECKLIST.md):
  □ TypeScript: 0 errors (pnpm tsc --noEmit)
  □ Lint: 0 errors (pnpm lint)
  □ Build: passes (pnpm build)
  □ E2E tests: all pass
  □ Pending migration files reviewed by second engineer
  □ DATABASE_URL points to production DB
  □ All required secrets present in Replit secrets

Deploy sequence (automated on Replit):
  1. Build Next.js app (pnpm build)
  2. Run prisma migrate deploy (applies pending migrations)
  3. Start app (pnpm start)
  4. Health check: GET /api/health → must return 200
  5. Smoke tests (see GO_LIVE_CHECKLIST.md §2)
```

### 3.5 Rollback Plan

| Scenario | Action |
|---|---|
| Build failure | Replit keeps previous deployment live. No action needed. |
| Migration failure | Deployment aborts. Previous version still live. Write a forward-fix migration. Do NOT touch production DB directly. |
| Post-deploy bug (data-safe) | Revert code via Replit checkpoint. No migration rollback needed. |
| Post-deploy bug (data-changed) | Write a forward-fix migration to correct data. Deploy urgently. Document in incident log. |
| Fee transaction corruption | Restore from last 24h backup. Contact all affected schools immediately. |

**Rollback triggers (from GO_LIVE_CHECKLIST.md):**
- 2 consecutive failed health checks
- Fee collection returning 500 errors
- Any cross-tenant data leak confirmed

### 3.6 Monitoring Setup

Set up before the first pilot school is onboarded:

```
Health monitoring:
  Tool: UptimeRobot (free tier)
  Check: GET https://app.schoolerp.in/api/health every 5 minutes
  Alert: Email to on-call engineer if 2 consecutive failures

Error monitoring:
  Tool: Replit deployment logs (current) → add Sentry in M8
  Pattern: Watch for 5xx error rate > 1% over any 5-minute window
  Alert: Email notification

Database monitoring:
  Tool: Replit PostgreSQL dashboard
  Watch: Active connections, query time, disk usage
  Alert: > 80% disk capacity

Job queue monitoring:
  Query: SELECT type, status, COUNT(*) FROM "JobQueue" 
         WHERE status='FAILED' AND attempts >= max_attempts 
         GROUP BY type, status
  Frequency: Check daily
  Alert: Any FAILED job with maxAttempts exceeded

Fee integrity check (weekly):
  Query: SELECT studentId, academicYearId,
         totalPaid - SUM(fc.amount) AS drift
         FROM StudentFeeAccount sfa
         JOIN FeeCollection fc ON fc.studentId = sfa.studentId
         WHERE drift != 0
  Alert: Any non-zero drift means totalPaid is out of sync — investigate immediately
```

### 3.7 Backup and Recovery

```
Backup:
  Replit PostgreSQL: automated daily backup (managed)
  Retention: 7 days
  Test restore: once per month on staging DB

File assets:
  Supabase Storage: automated backup (managed by Supabase)
  PDFs (report cards, receipts): most can be regenerated from DB data if lost

Recovery test schedule:
  Before M8 pilot: Full restore drill — restore staging from production backup
  Document: Time taken, any data gaps found
```

---

## 4. Seed Data Strategy

Three distinct seed profiles for three distinct purposes. Never mix them.

### 4.1 Seed Profile 1 — Development (`seed:dev`)

**Purpose:** Fast iteration during feature development. Minimal realistic data.  
**Command:** `pnpm --filter @workspace/academia exec tsx prisma/seeds/dev.ts`

```
Creates:
  1 Tenant: { slug: "dev-school", name: "Dev Test School", board: CBSE, tier: ENTERPRISE }
  1 SchoolConfig: { gradingSystem: TEN_POINT, workingDays: 6 }

  1 AcademicYear: { name: "2024-25", isCurrent: true }
  4 Terms: FA1 (20%), FA2 (20%), SA1 (30%), SA2 (30%)

  5 Grades: KG, Class 1, Class 5, Class 10, Class 12
  3 Sections: A, B, C
  5 Departments: Science, Mathematics, Languages, Arts, Commerce
  8 Subjects: Mathematics, Hindi, English, Science, EVS, Physics, Chemistry, Biology

  Users (all password: "devpass123"):
    1 SUPER_ADMIN:     super@dev.test
    1 SCHOOL_ADMIN:    admin@dev.test
    1 PRINCIPAL:       principal@dev.test
    1 ACCOUNTANT:      accounts@dev.test
    1 HOD:             hod@dev.test       (Science department)
    3 CLASS_TEACHER:   teacher1@dev.test, teacher2@dev.test, teacher3@dev.test
    2 PARENT:          parent1@dev.test (linked to student1), parent2@dev.test (linked to student2)

  3 Classes: Class 10-A Mathematics, Class 10-A Science, Class 10-B Mathematics
  12 Students in Class 10-A (admissionNo: ADM-2024-0001 to ADM-2024-0012)
  2 Students in Class 10-B
  3 Parents linked to Class 10-A students

  2 Exams: "FA1 Math Test" (maxMarks: 50), "FA1 Science Test" (maxMarks: 50)
  Marks: 10 SUBMITTED, 2 LOCKED (for testing parent portal marks visibility)

  FeeCategories: Tuition Fee, Transport Fee
  FeeStructure: Class 10 → Tuition = ₹5,000/month, Transport = ₹1,500/month
  FeeInstallments: Generated for 3 months (April, May, June) for 12 Class 10-A students
  1 FeeCollection: receipt RCP-2024-00001, ₹5,000, CASH, for student 1

  3 Notices: 1 published (ALL), 1 draft, 1 grade-specific (Class 10 only)

Idempotent: Running seed twice does not create duplicates (uses upsert, not create)
```

### 4.2 Seed Profile 2 — Staging (`seed:staging`)

**Purpose:** Realistic volume for performance testing and UAT. Mirrors a mid-sized school.  
**Command:** `pnpm --filter @workspace/academia exec tsx prisma/seeds/staging.ts`

```
Creates:
  2 Tenants:
    { slug: "greenfield-pune", name: "Greenfield Academy, Pune", board: CBSE }
    { slug: "sunrise-nagpur",  name: "Sunrise High School, Nagpur", board: STATE_BOARD }

  Per tenant:
    1 AcademicYear (2024-25, isCurrent)
    4 Terms (CBSE standard)
    12 Grades (Class 1–12)
    3 Sections (A, B, C) for Classes 1–10; 2 Sections for 11–12
    6 Departments
    15 Subjects
    Full class matrix: 12 grades × 3 sections × 5 subjects = ~180 Class records
    25 Faculty users (one per subject group)
    500 Students distributed across all grades (40–45 per grade)
    500 Parents (1:1 ratio with students for simplicity)
    
    Exam and marks data:
      3 Exams per class (FA1 complete: all LOCKED, FA2 in progress: mixed SUBMITTED/PENDING)
    
    Fee data:
      3 FeeCategories
      Full FeeStructure for all 12 grades
      All FeeInstallments generated for April–September (6 months)
      70% of April installments PAID (realistic collection rate)
      ReceiptSequence seeded to lastSeq=350

    5 published notices, 2 drafts

Test accounts (password: "staging123!"):
  superadmin@staging.test           SUPER_ADMIN
  admin@greenfield-pune.test        SCHOOL_ADMIN (Greenfield)
  admin@sunrise-nagpur.test         SCHOOL_ADMIN (Sunrise)
  accountant@greenfield-pune.test   ACCOUNTANT (Greenfield)
  teacher1@greenfield-pune.test     CLASS_TEACHER, Class 10-A
  parent1@greenfield-pune.test      PARENT, linked to student ADM-2024-0001

Danger flag: STAGING_DB=true env var required. Script aborts if not set.
```

### 4.3 Seed Profile 3 — Pilot (`seed:pilot`)

**Purpose:** Onboarding a real school for their 90-day trial. Minimal scaffold — school sets up their own data.  
**Command:** `pnpm --filter @workspace/academia exec tsx prisma/seeds/pilot.ts -- --slug=<slug> --name=<name> --email=<admin-email> --board=<CBSE|ICSE|STATE_BOARD>`

```
Creates ONLY:
  1 Tenant (from CLI args)
  1 SchoolConfig (defaults: TEN_POINT grading, 6 working days, April year start)
  1 User (SCHOOL_ADMIN, email from CLI arg, temp password auto-generated)
  1 AcademicYear (current calendar year, April–March)
  ReceiptSequence (prefix: "RCP", lastSeq: 0)
  
Does NOT create:
  ← No students (school imports their own)
  ← No faculty (school creates their own)
  ← No fee structure (school configures their own)
  ← No grades/sections (school sets up their own)

Post-creation output (printed to console):
  School slug:   greenfield-nashik
  Admin email:   principal@greenfield.in
  Temp password: X7k#mP2q          ← 12-char random, alphanumeric+symbols
  Login URL:     https://app.schoolerp.in/auth/login
  
  ACTION REQUIRED:
  1. Email the above credentials to principal@greenfield.in
  2. Add school to UptimeRobot monitoring group
  3. Schedule onboarding call for this week
  4. Verify trialEndsAt = today + 90 days

Idempotent? NO. Running twice creates a second tenant. Check slug uniqueness first.
```

### 4.4 Seed File Structure

```
prisma/
  schema.prisma
  migrations/
    ...
  seeds/
    dev.ts           ← Profile 1: fast dev iteration
    staging.ts       ← Profile 2: UAT and performance testing
    pilot.ts         ← Profile 3: real school onboarding
    shared/
      grades.ts      ← Standard Indian grade set (Nursery, KG, 1–12) — shared by all profiles
      subjects.ts    ← Common CBSE subjects lookup — shared by all profiles
      users.ts       ← Helper: createUser(email, role, schoolId) with bcrypt hash
      fees.ts        ← Helper: generateInstallments(structures, students, year)
```

---

## 5. Frontend UI Component Map

Components organized by portal, then module, then page. Each component is listed with its shadcn/ui base, data source, and the spec section it implements.

### 5.1 Shared / Global Components

These appear across all portals and are built once.

| Component | Base UI | Used in | Notes |
|---|---|---|---|
| `AppShell` | `Sheet`, `Sidebar` | All portals | Existing `app-shell.tsx`. Extend with role-aware nav items. |
| `PageHeader` | `div` | All pages | Title, breadcrumb, optional action button slot |
| `StatCard` | `Card` | All dashboards | Icon + label + value + trend. Used in 5+ dashboards. |
| `DataTable<T>` | `Table` | All list pages | TanStack Table v8. Column defs, sorting, pagination, search. Build once. |
| `FilterBar` | `Select`, `Input` | All list pages | Composable filter row. Props: filters[], onChange |
| `ConfirmDialog` | `AlertDialog` | Any destructive action | "Are you sure?" with consequence statement |
| `StatusBadge` | `Badge` | Multiple | Maps enum values → color. `MarksStatus`, `InstallmentStatus`, `JobStatus` |
| `EmptyState` | `div` | All list pages | Illustration + message + optional CTA button |
| `LoadingSpinner` | `div` | All async | Centered spinner for page-level loading |
| `ToastProvider` | `Sonner` | Global | Wrap in root layout. Used for success/error feedback |
| `FileUpload` | `Input[type=file]` | Student photo, notice attachment, Excel import | Single reusable component |
| `RichTextEditor` | `Tiptap` or `react-quill` | Notice body | Simple toolbar: bold, italic, link, list |
| `Portal` (nav guard) | `redirect()` | All portal layouts | Reads session role → redirects if wrong portal |

### 5.2 Admin Portal

#### Dashboard `/admin`
| Component | Data source | Spec ref |
|---|---|---|
| `AdminDashboard` | Multiple API calls, TanStack Query | M1 deliverable |
| `AttendanceSummaryCard` | `GET /api/v1/attendance/school-summary?date=today` | §3.5 |
| `FeeCollectionCard` | `GET /api/v1/fees/summary?academicYearId=current` | §3.9 |
| `PendingLocksCard` | `GET /api/v1/marks?status=LOCK_PENDING&count=true` | §3.6 |
| `RecentNoticesCard` | `GET /api/v1/notices?isPublished=true&limit=3` | §3.11 |
| `QuickActionsPanel` | Static | Links to most-used admin actions |

#### School Setup `/admin/setup`
| Component | Data source |
|---|---|
| `SchoolInfoForm` | `GET/PATCH /api/v1/school` |
| `LogoUpload` | `POST /api/v1/files/upload` → FileAsset |
| `SchoolConfigForm` | `GET/PATCH /api/v1/school/config` |
| `BoardSelector` | Static enum: CBSE / ICSE / STATE_BOARD / OTHER |

#### Academic Years `/admin/academic-years`
| Component | Data source |
|---|---|
| `AcademicYearList` | `GET /api/v1/academic-years` |
| `AcademicYearCard` | Per year — shows name, dates, status (current/locked), term count |
| `AcademicYearForm` | `POST /api/v1/academic-years` / `PATCH /api/v1/academic-years/[id]` |
| `TermList` | `GET /api/v1/academic-years/[id]/terms` |
| `TermForm` | `POST /api/v1/academic-years/[id]/terms` |
| `SetCurrentButton` | `POST /api/v1/academic-years/[id]/set-current` + ConfirmDialog |
| `LockYearButton` | `POST /api/v1/academic-years/[id]/lock` + ConfirmDialog |

#### School Structure `/admin/grades`
| Component | Data source |
|---|---|
| `GradeSectionManager` | Three-column layout: Grades | Sections | Subjects |
| `GradeList` + `GradeForm` | `GET/POST/PATCH/DELETE /api/v1/grades` |
| `SectionList` + `SectionForm` | `GET/POST/PATCH /api/v1/sections` |
| `SubjectList` + `SubjectForm` | `GET/POST/PATCH/DELETE /api/v1/subjects` |
| `DepartmentManager` | `/admin/departments` — `GET/POST/PATCH /api/v1/departments` |

#### Students `/admin/students`
| Component | Data source |
|---|---|
| `StudentList` | `GET /api/v1/students?grade=&section=&search=&isActive=` |
| `StudentFilters` | Grade select + Section select + Search input + Active toggle |
| `AdmissionForm` | Multi-step: Personal → Contact → Parent → Class → Review |
| `PersonalInfoStep` | Name, DOB, gender, blood group, category, religion |
| `ContactStep` | Address (line1, city, state, pincode), student phone |
| `ParentStep` | Father/mother/guardian name + primaryPhone + email. Shows "Link existing parent" if phone matches |
| `ClassEnrollStep` | Grade + Section dropdowns → enrolls in all subjects for that grade+section |
| `StudentProfile` | Tabbed: Info / Class History / Attendance / Marks / Fees |
| `StudentInfoTab` | Read-only profile + Edit button (SCHOOL_ADMIN only) |
| `AttendanceTab` | Monthly calendar heatmap + term % summary |
| `MarksTab` | Term accordion → exam → marks table |
| `FeesTab` | `StudentFeeAccount` summary + installment list |
| `PhotoUpload` | `FileUpload` component + preview |
| `TransferOutDialog` | ConfirmDialog + TC date field + reason |
| `BulkImportPage` | File upload → preview table with validation errors → confirm import |

#### Faculty `/admin/faculty`
| Component | Data source |
|---|---|
| `FacultyList` | `GET /api/v1/faculty?departmentId=&search=` |
| `FacultyForm` | Create/edit staff: name, email, phone, department, employeeId |
| `FacultyProfile` | Info + assigned classes + department memberships |
| `ClassAssignmentTable` | Which classes this faculty teaches |

#### Parents `/admin/parents`
| Component | Data source |
|---|---|
| `ParentList` | `GET /api/v1/parents?search=` |
| `ParentProfile` | Contact info + linked children cards |
| `LinkedChildCard` | Student name + grade + section + relation type |
| `LinkStudentDialog` | Search student by admissionNo → add ParentStudent record |

#### Classes `/admin/classes`
| Component | Data source |
|---|---|
| `ClassList` | `GET /api/v1/classes?gradeId=&sectionId=&academicYearId=` |
| `ClassCard` | Grade + Section + Subject + Teacher name + enrolled student count |
| `ClassForm` | Grade select + Section select + Subject select + Faculty select + AcademicYear |
| `ClassDetail` | Student enrollment table + Add/Remove student |
| `BulkEnrollDialog` | Select grade+section → enroll all matching students in this class |

#### Attendance `/admin/attendance`
| Component | Data source |
|---|---|
| `SchoolAttendanceBoard` | `GET /api/v1/attendance/school-summary?date=` |
| `AttendanceHeatmapGrid` | Rows=Classes, Columns=dates, Color=% present |
| `ClassAttendanceHistory` | `GET /api/v1/attendance?classId=&month=` |
| `AttendanceCorrectionQueue` | Pending correction requests — extends existing Requests UI |

#### Marks `/admin/marks`
| Component | Data source |
|---|---|
| `PendingLocksTable` | `GET /api/v1/marks?status=LOCK_PENDING` |
| `LockApprovalRow` | Shows class, exam, teacher, mark summary → Approve / Reject buttons |
| `MarksOverview` | Filter by class + exam + status |

#### Report Cards `/admin/report-cards`
| Component | Data source |
|---|---|
| `ReportCardManager` | Grid: Term rows × Grade columns. Status: not configured / configured / generated / published |
| `ConfigureTemplateDialog` | `PUT /api/v1/report-cards/config` — grading system, show/hide toggles |
| `GenerateButton` | `POST /api/v1/report-cards/generate` → shows job progress via polling |
| `JobProgressBar` | Polls `GET /api/v1/jobs/[id]` every 2 seconds |
| `PublishButton` | `POST /api/v1/report-cards/publish` + ConfirmDialog |
| `ReportCardPreview` | Embedded PDF viewer (iframe or react-pdf viewer) |

#### Fee Management `/admin/fees`
| Component | Data source |
|---|---|
| `FeeStructureGrid` | Rows=Grades, Columns=FeeCategories. Editable amount cells |
| `FeeStructureForm` | `POST/PATCH /api/v1/fees/structure` |
| `GenerateInstallmentsButton` | `POST /api/v1/fees/structure/generate-installments` + JobProgressBar |
| `CollectionWorkflow` | Accountant's primary screen |
| `StudentFeeSearch` | Search by name or admissionNo. Shows fee account summary on select |
| `InstallmentSelector` | Checkboxes for pending installments, shows total |
| `PaymentForm` | Amount, paymentMode + conditional fields (chequeNo, bankName, transactionRef) |
| `ReceiptPreview` | Inline PDF preview after successful collection |
| `PrintReceiptButton` | `window.print()` with print-only CSS |
| `DuesReport` | Filterable table: student + grade + category + dueAmount. Export to CSV |
| `FeeCollectionSummary` | Collected today / this month / this year. Split by paymentMode |
| `ReceiptSearchTable` | Search receipts by receiptNo / student / date range |
| `VoidReceiptDialog` | Reason field + ConfirmDialog (SCHOOL_ADMIN only) |
| `ConcessionDialog` | Amount + note field. Warns: "This will regenerate installments" |

#### Notices `/admin/notices`
| Component | Data source |
|---|---|
| `NoticeList` | `GET /api/v1/notices?isPublished=&type=` |
| `NoticeCard` | Title, type badge, audience badge, published/draft status, expiry |
| `NoticeForm` | Title + RichTextEditor + type/priority/audience selects + GradeMultiSelect + AttachmentUpload + ExpiresAt |
| `PublishNoticeButton` | `POST /api/v1/notices/[id]/publish` |
| `NoticeFeed` | Read-only chronological feed. Used in all portals. |

#### RBAC / Roles `/admin/roles`
*(Existing pages — no redesign needed)*

#### Audit Logs `/admin/logs`
*(Existing page — no redesign needed)*

### 5.3 Faculty Portal

| Component | Page | Data source |
|---|---|---|
| `FacultyDashboard` | `/faculty` | Assigned classes, today's attendance status, pending requests |
| `MyClassesList` | `/faculty/classes` | `GET /api/v1/classes?facultyId=me` |
| `ClassCard` | In class list | Grade + Section + Subject + student count + today's attendance status |
| `AttendanceMarker` | `/faculty/attendance` | Two-panel: class+date picker → student toggle grid |
| `ClassDatePicker` | Left panel | Select class from assigned list + date picker (max: today) |
| `StudentToggleGrid` | Right panel | Student row + PRESENT/ABSENT/LATE toggle. Default: all PRESENT |
| `BulkMarkAbsentButton` | In toggle grid | Inverts selection — marks all as ABSENT, then teacher marks the present ones |
| `FinalizeAttendanceButton` | In toggle grid | `PUT /api/v1/attendance/session/[id]` + ConfirmDialog |
| `MarksEntryTable` | `/faculty/marks` | Class+Exam picker → editable marks grid |
| `ExamSelector` | Dropdown | Only exams assigned to this teacher's class/subject |
| `MarksGrid` | Table | Student name + mark input + grade indicator. Keyboard-navigable (Tab between cells) |
| `RequestLockButton` | Below marks grid | `POST /api/v1/marks/request-lock` |
| `RequestsList` | `/faculty/requests` | Existing page — extend with CORRECTION_REQUEST type |
| `NoticeFeed` | `/faculty/notices` | Shared `NoticeFeed` component |

### 5.4 Parent Portal

| Component | Page | Data source |
|---|---|---|
| `ParentDashboard` | `/parent` | Child selector (if >1 child) + overview cards |
| `ChildSelector` | Dashboard header | `GET /api/v1/parent/children` — dropdown if multiple |
| `ChildOverviewCard` | Dashboard | Name, class, section, admissionNo, photo. Attendance %, Fee due, Last marks |
| `AttendanceCalendar` | `/parent/attendance` | `GET /api/v1/parent/children/[id]/attendance?month=` |
| `MonthlyHeatmap` | In attendance | Grid of days, color-coded by status. Month navigator. |
| `AttendanceSummaryBar` | Above heatmap | Present / Absent / Late counts for selected month |
| `MarksView` | `/parent/marks` | `GET /api/v1/parent/children/[id]/marks?termId=` |
| `TermAccordion` | In marks | Accordion per term. Only shows terms with `isPublished=true`. |
| `SubjectMarksRow` | In term accordion | Subject name + marks + maxMarks + grade badge. Only LOCKED marks shown. |
| `ReportCardList` | `/parent/report-cards` | `GET /api/v1/parent/children/[id]/report-cards` |
| `ReportCardEntry` | Per term | Term name + generated date + Download PDF button. Only published shown. |
| `FeeView` | `/parent/fees` | `GET /api/v1/parent/children/[id]/fees?academicYearId=current` |
| `FeeAccountSummary` | Top of fee view | Total / Paid / Due with color-coded amounts |
| `InstallmentList` | Below summary | Each installment: category + due date + amount + status badge. Overdue ones highlighted red. |
| `PaymentHistoryList` | Below installments | FeeCollection records: receipt no. + date + amount + mode + Download Receipt link |
| `NoticeFeed` | `/parent/notices` | Shared `NoticeFeed` component, filtered for PARENTS audience |
| `ParentProfile` | `/parent/profile` | Name, phone, email + Change Password form |

### 5.5 Super Admin Portal

| Component | Page | Data source |
|---|---|---|
| `TenantList` | `/super-admin/tenants` | `GET /api/v1/tenants` |
| `TenantRow` | In list | Name + slug + board + plan + status + student count + last activity |
| `TenantStatusBadge` | In list | TRIAL / ACTIVE / SUSPENDED / CHURNED — color coded |
| `OnboardingWizard` | `/super-admin/tenants/new` | Multi-step: School details → Admin user → Config → Send email |
| `TenantDetail` | `/super-admin/tenants/[id]` | Usage metrics + subscription management + user list |
| `UsageMetricsPanel` | In tenant detail | Students, Faculty, Parents, Storage used, Last login |
| `ImpersonateButton` | In tenant detail | `POST /api/v1/tenants/[id]/impersonate` + ConfirmDialog + AuditLog |
| `SubscriptionPanel` | In tenant detail | Current plan + change plan + suspend + churn buttons |
| `ImpersonationBanner` | Shown when impersonating | Yellow bar: "Impersonating {school name}. Click to exit." |

---

## 6. Prisma Implementation Sequence

The order in which Prisma migrations must be written and applied. Each migration has a name, what it adds, and which spec entities it covers. Never write migration N+1 before migration N is merged.

```
MIGRATION SEQUENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

M00 — init_from_current_schema          (Sprint 1, Week 1)
  Action: prisma migrate dev --name init_from_current_schema
  Result: Creates migrations/ directory from current db:push state.
          All existing tables documented in migration.sql.
          This is a snapshot migration — no schema changes.
  Entities covered: All 20 existing models [E] — User, Role, Permission,
    RolePermission, RoleAssignment, CustomFeature, CustomFeatureAssignment,
    RBACLog, Department, Faculty, FacultyDepartment, Class, ClassStudent,
    Student, Exam, Marks, MarksHistory, Request, AuditLog, FileAsset
  Validation: 
    □ `prisma migrate status` shows "Database schema is up to date"
    □ All 41 existing E2E tests pass

M01 — add_tenant_model                  (Sprint 1, Week 1)
  Adds: Tenant model (id, slug, name, board, subscriptionTier,
        subscriptionStatus, trialEndsAt, isActive)
  Adds: SchoolConfig model (1:1 with Tenant)
  Adds: SubscriptionTier, SubscriptionStatus, SchoolBoard enums
  Data migration step:
    INSERT INTO "Tenant" (id, slug, name, board, ...)
    SELECT DISTINCT schoolId, schoolId, 'Default School', 'CBSE', ...
    FROM "User"
    -- Then add FK constraints
  After migration:
    □ Backfill verified: COUNT(Tenant) == COUNT(DISTINCT schoolId FROM User)
    □ All schoolId columns now reference Tenant.id via FK
    □ tenantDb() helper written and used in all existing route handlers

M02 — extend_user_model                 (Sprint 1, Week 2)
  Alters: User — adds phone (nullable), isActive (default true),
          lastLoginAt (nullable), avatarUrl (nullable)
  Alters: UserRole enum — adds PRINCIPAL, ACCOUNTANT, PARENT
          (STUDENT deferred to v2)
  No data migration needed (new nullable columns)
  Validation:
    □ Login with role=PRINCIPAL → reaches /admin portal
    □ Login with role=ACCOUNTANT → reaches /admin portal (fee-restricted)
    □ Login with role=PARENT → reaches /parent portal

M03 — add_academic_structure            (Sprint 2, Week 1)
  Adds: AcademicYear model (id, schoolId, name, startDate, endDate,
        isCurrent, isLocked)
  Adds: Term model (id, schoolId, academicYearId, name, examType,
        order, weightage, startDate, endDate, isPublished)
  Adds: Grade model (id, schoolId, name, level, order)
  Adds: Section model (id, schoolId, name)
  Adds: Subject model (id, schoolId, name, code, subjectType, departmentId)
  Adds: ExamType, SubjectType enums
  No data migration needed (new tables)
  Validation:
    □ Can create AcademicYear via API
    □ Can create 4 Terms under an AcademicYear
    □ UNIQUE(schoolId, name) prevents duplicate year names

M04 — refactor_class_model              (Sprint 2, Week 2)
  Alters: Class — adds gradeId (nullable FK → Grade),
          sectionId (nullable FK → Section),
          subjectId (nullable FK → Subject),
          academicYearId (nullable FK → AcademicYear),
          classTeacherId (nullable FK → Faculty, rename from facultyId)
  IMPORTANT: Add FK columns as nullable first.
  Data migration: 
    UPDATE "Class" SET gradeId = (SELECT id FROM Grade WHERE ...)
    -- Match on existing grade string field
    -- Log any classes that cannot be matched
  After data migration: Add NOT NULL constraint where Grade exists.
  Changes UNIQUE constraint:
    OLD: @@unique([schoolId, departmentId, grade, section, subject])
    NEW: @@unique([schoolId, gradeId, sectionId, subjectId, academicYearId])
  Validation:
    □ All existing Class records have gradeId populated
    □ Existing E2E tests for classes still pass
    □ New UNIQUE constraint prevents duplicate class creation

M05 — extend_student_model              (Sprint 3, Week 1)
  Alters: Student — adds admissionNo (nullable String, then UNIQUE after backfill),
          phone, dateOfBirth, gender, bloodGroup, address (Json),
          photo, category, religion, motherTongue, previousSchool,
          admissionDate, currentGrade (Int), currentSection (String?),
          isActive (Boolean default true), userId (nullable FK → User)
  Alters: ClassStudent — adds academicYearId (nullable FK → AcademicYear)
  Adds: Gender, StudentCategory enums
  Data migration:
    UPDATE "Student" SET admissionNo = 'LEGACY-' || id WHERE admissionNo IS NULL
    UPDATE "Student" SET isActive = true WHERE isActive IS NULL
    UPDATE "Student" SET admissionDate = createdAt WHERE admissionDate IS NULL
  After migration: admissionNo becomes NOT NULL.
  Adds: INDEX(schoolId, currentGrade, currentSection), INDEX(schoolId, isActive)
  Validation:
    □ All students have admissionNo (no NULLs)
    □ Student CRUD API accepts new fields
    □ admissionNo UNIQUE constraint enforced

M06 — add_parent_model                  (Sprint 3, Week 1)
  Adds: Parent model (id, schoolId, userId, fatherName, motherName,
        guardianName, primaryPhone, secondaryPhone, email, occupation,
        address, isActive)
  Adds: ParentStudent model (id, parentId, studentId, relation, isPrimary)
  Adds: ParentRelation enum
  No data migration needed
  Validation:
    □ Can create Parent and link to Student
    □ ParentStudent UNIQUE(parentId, studentId) enforced
    □ isPrimary: only one true per student (enforced in app layer, not DB)

M07 — add_attendance_models             (Sprint 5, Week 1)
  Adds: AttendanceSession model (id, schoolId, classId, academicYearId,
        date @db.Date, markedBy, markedAt, isFinalized, notes)
  Adds: AttendanceRecord model (id, sessionId, studentId, status, remark)
  Adds: AttendanceStatus enum
  No data migration needed
  Adds: INDEX(schoolId, date), UNIQUE(classId, date), UNIQUE(sessionId, studentId)
  Validation:
    □ UNIQUE(classId, date) prevents duplicate sessions
    □ createMany() for AttendanceRecord inserts all 60 student records < 300ms

M08 — add_report_card_models            (Sprint 6, Week 1)
  Alters: Exam — adds termId (nullable FK → Term, then required),
          academicYearId (nullable FK → AcademicYear, then required)
  Alters: Marks — adds termId (nullable), academicYearId (nullable)
  Data migration: 
    UPDATE Exam SET termId = (resolve from existing data)
    UPDATE Marks SET termId = (via Exam FK chain)
  Adds: ReportCardConfig model
  Adds: ReportCard model
  Adds: ReportTemplate enum
  Validation:
    □ All Exams have termId populated
    □ Report card generation pipeline produces valid PDF

M09 — add_fee_models                    (Sprint 7, Week 1)
  Adds: FeeCategory model
  Adds: FeeStructure model
  Adds: StudentFeeAccount model
  Adds: FeeInstallment model
  Adds: ReceiptSequence model
  Adds: FeeCollection model
  Adds: FeeCollectionInstallment model
  Adds: FeeFrequency, PaymentMode, InstallmentStatus enums
  No data migration needed
  CRITICAL index: INDEX(dueDate, status) for overdue queries
  CRITICAL index: INDEX(schoolId, academicYearId, status) for dues report
  Validation:
    □ ReceiptSequence UNIQUE(schoolId, academicYearId) enforced
    □ FeeCollection receiptNo UNIQUE enforced
    □ Concurrent collection test: 10 simultaneous → 0 duplicate receiptNos

M10 — add_notice_models                 (Sprint 9, Week 1)
  Adds: Notice model (id, schoolId, title, body @db.Text, type, priority,
        targetAudience, gradeIds String[], isPublished, publishedAt,
        expiresAt, attachmentKey, createdBy)
  Adds: NotificationLog model
  Adds: NoticeType, NoticeAudience, NotificationChannel, NotificationStatus enums
  No data migration needed
  Validation:
    □ Notice gradeIds array works with PostgreSQL array type
    □ NotificationLog entries created on email send

M11 — add_job_queue                     (Sprint 4 or when first needed)
  Adds: JobQueue model
  Adds: JobType, JobStatus enums
  No data migration needed
  Validation:
    □ Job can be created with PENDING status
    □ Job worker can claim and update status to RUNNING
    □ Failed jobs increment attempts, stop at maxAttempts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEPENDENCY ORDER:
  M00 → M01 → M02 → M03 → M04 → M05 → M06 → M07 → M08 → M09 → M10
                                              ↑
                                         M11 can go here (parallel need)

RULES:
  - Each migration reviewed by second engineer before merge
  - Staging DB updated before production in every case
  - Never add NOT NULL without a DEFAULT or a data migration
  - Run `prisma migrate status` before starting any new migration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 7. Sprint 1 and Sprint 2 Task Breakdown

### Sprint 1 — Migration Safety (Weeks 1–2)

**Goal:** The existing codebase is production-safe with a proper migration history, Tenant model, and hardened tenant isolation. Zero new features. Every existing test still passes at the end of Sprint 1.

**Definition of Done:** `prisma migrate status` shows clean history. `tenantDb()` wraps all data access. Cross-tenant integration test passes. All 41 E2E tests green.

---

**Day 1–2: Convert db:push to prisma migrate**

```
Task S1-01: Create initial migration from current schema
  Owner: Engineer A
  File: prisma/migrations/{timestamp}_init_from_current_schema/
  Steps:
    1. pnpm --filter @workspace/academia exec prisma migrate dev \
         --name init_from_current_schema --create-only
    2. Review generated migration.sql — verify it matches current schema exactly
    3. Run: prisma migrate deploy (applies it to dev DB)
    4. Verify: prisma migrate status → "Database schema is up to date"
    5. Commit migrations/ directory
  Acceptance: `prisma migrate status` clean. Zero data changes.
  Time estimate: 3 hours

Task S1-02: Add migrations/ to git and remove db:push from scripts
  Owner: Engineer A
  Changes:
    - package.json: remove "db:push" script, add "db:migrate" script
    - README.md: update setup instructions
    - Add .gitignore exception: !prisma/migrations/**
  Acceptance: `git diff --stat` shows only package.json + README changes
  Time estimate: 1 hour
```

**Day 2–3: Add Tenant model**

```
Task S1-03: Write Tenant + SchoolConfig Prisma models
  Owner: Engineer A
  File: prisma/schema.prisma
  Add models: Tenant, SchoolConfig
  Add enums: SubscriptionTier, SubscriptionStatus, SchoolBoard
  Run: prisma migrate dev --name add_tenant_model
  Time estimate: 2 hours

Task S1-04: Write data backfill migration for Tenant
  Owner: Engineer A
  File: Add raw SQL to migration.sql for Tenant backfill:
    INSERT INTO "Tenant" (id, slug, name, board, "subscriptionTier", ...)
    SELECT DISTINCT "schoolId", "schoolId", 'Default School', 'CBSE', ...
    FROM "User"
    ON CONFLICT DO NOTHING;
  Then add FK constraints to all schoolId columns.
  Test on: dev DB with existing data. Verify no orphaned schoolId values.
  Acceptance: COUNT(Tenant) == COUNT(DISTINCT "schoolId" FROM "User")
  Time estimate: 4 hours

Task S1-05: Build tenantDb() helper
  Owner: Engineer B
  File: src/lib/db-tenant.ts
  Interface: tenantQuery(schoolId: string) returns object with
    scoped methods for: user, faculty, student, class, classStudent,
    exam, marks, marksHistory, request, auditLog, rbacLog, fileAsset,
    department, role, roleAssignment, customFeature, customFeatureAssignment
  Each method: passes schoolId in where clause automatically
  TypeScript: Fully typed return types matching Prisma generated types
  Time estimate: 6 hours

Task S1-06: Update all existing route handlers to use tenantDb()
  Owner: Engineer B
  Files: All files in src/app/api/ and src/app/api/v1/
  Count: ~25 route files
  Pattern:
    BEFORE: const students = await db.student.findMany({ where: { schoolId } })
    AFTER:  const tdb = tenantQuery(ctx.schoolId)
            const students = await tdb.student.findMany({ ... })
  Acceptance: grep for "db.student\|db.marks\|db.class\|db.exam" in route files → 0 results
  Time estimate: 5 hours
```

**Day 3–4: Extend User model + roles**

```
Task S1-07: Extend User model
  Owner: Engineer A
  Migration name: extend_user_model
  Adds to User: phone String?, isActive Boolean @default(true),
                lastLoginAt DateTime?, avatarUrl String?
  Adds to UserRole enum: PRINCIPAL, ACCOUNTANT, PARENT
  No data migration needed (nullable columns + enum addition)
  Time estimate: 2 hours

Task S1-08: Update auth middleware for new roles
  Owner: Engineer B
  File: src/middleware.ts (and portal layout guards)
  Changes:
    - PRINCIPAL → allowed on /admin/* (read-heavy permissions)
    - ACCOUNTANT → allowed on /admin/fees/* only
    - PARENT → redirected to /parent/* (portal doesn't exist yet — show "coming soon")
  Test: Login as each new role, verify correct redirect
  Time estimate: 3 hours

Task S1-09: Update SchoolConfig schema + seed for dev
  Owner: Engineer A
  Migration name: add_school_config (can combine with extend_user_model)
  Adds SchoolConfig model with FK to Tenant
  Updates prisma/seeds/dev.ts:
    - Creates dev Tenant record
    - Creates SchoolConfig with defaults
    - Seeds users with all 9 roles (use test emails from §4.1)
  Time estimate: 4 hours
```

**Day 4–5: Tests + cross-tenant guard**

```
Task S1-10: Write cross-tenant integration test
  Owner: Engineer B
  File: tests/security/cross-tenant.test.ts
  Test cases:
    1. Login as School A admin → request student from School B → expect 404 or empty
    2. Login as School A teacher → request marks from School B exam → expect 403
    3. Login as School A parent → request School B student data → expect 403
    4. tenantDb() called without schoolId → throws TypeError immediately
  Must PASS before any new feature code merges to main.
  Time estimate: 4 hours

Task S1-11: Run full E2E suite and fix any regressions
  Owner: Both engineers
  Command: pnpm --filter @workspace/academia test
  Target: All 41 existing tests green
  Common regression causes:
    - tenantDb() wrapper missing a model method
    - New role in UserRole enum breaking role-guard switch statements
    - Migration applying FK constraint that fails on dev data
  Time estimate: 3 hours (fix time included)

Task S1-12: Sprint 1 review
  Owner: Both engineers
  Checklist:
    □ prisma migrate status: clean
    □ migrations/ directory committed
    □ tenantDb() used in all routes (grep confirms 0 direct db.model calls in routes)
    □ Cross-tenant test: PASSING
    □ All 41 E2E tests: PASSING
    □ Login as each of the 9 roles: correct portal redirect
    □ No db:push references in package.json or documentation
```

---

### Sprint 2 — Academic Structure (Weeks 3–4)

**Goal:** Admin can set up the complete school structure for a new academic year: grades, sections, subjects, departments, academic year, and terms. Classes are refactored to use FK references.

**Definition of Done:** Admin can complete the school setup wizard end-to-end. Academic year and 4 terms exist. Classes use FK references. All existing class-related E2E tests pass.

---

**Day 1–2: Academic Year + Term models + APIs**

```
Task S2-01: Add AcademicYear + Term migrations
  Owner: Engineer A
  Migration name: add_academic_structure
  Adds: AcademicYear, Term, Grade, Section, Subject models
  Adds: ExamType, SubjectType enums
  Run on dev DB. Verify no existing data affected.
  Time estimate: 2 hours

Task S2-02: Academic Year API routes
  Owner: Engineer A
  Files: src/app/api/v1/academic-years/route.ts
         src/app/api/v1/academic-years/[id]/route.ts
         src/app/api/v1/academic-years/[id]/set-current/route.ts
         src/app/api/v1/academic-years/[id]/lock/route.ts
         src/app/api/v1/academic-years/[id]/terms/route.ts
         src/app/api/v1/academic-years/[id]/terms/[termId]/route.ts
  Key business logic:
    - set-current: transaction → set all to false → set target to true
    - lock: prevent if any marks are not LOCKED in this year
    - terms UNIQUE: (schoolId, academicYearId, name)
    - weightage sum: validate terms sum to 100 on create/edit
  Zod schemas: src/schemas/academic-year.ts
  Time estimate: 6 hours

Task S2-03: Grade / Section / Subject API routes
  Owner: Engineer B
  Files: src/app/api/v1/grades/route.ts (+ [id]/route.ts)
         src/app/api/v1/sections/route.ts (+ [id]/route.ts)
         src/app/api/v1/subjects/route.ts (+ [id]/route.ts)
  All standard CRUD with schoolId scoping.
  Guard: delete only if no dependent Classes exist.
  Time estimate: 4 hours
```

**Day 2–3: Class model refactor**

```
Task S2-04: Class model FK migration
  Owner: Engineer A
  Migration name: refactor_class_model
  CAREFUL: Two-step approach:
    Step A: Add nullable FK columns (gradeId, sectionId, subjectId, academicYearId, classTeacherId)
    Step B: Data migration SQL (match existing grade/section/subject strings to new FK values)
    Step C: Log any unmatched rows (do NOT fail silently)
    Step D: Add NOT NULL constraint only after backfill verified
    Step E: Drop old string columns (grade, section, subject — but keep facultyId as alias for classTeacherId)
    Step F: Update UNIQUE constraint
  Pre-migration: Take dev DB backup
  Validation query: SELECT COUNT(*) FROM "Class" WHERE "gradeId" IS NULL — must be 0
  Time estimate: 6 hours (careful work)

Task S2-05: Update all Class-related API routes and Zod schemas
  Owner: Engineer B
  Files: src/app/api/v1/classes/*, src/app/api/classes/* (legacy)
         src/schemas/class.ts
  Changes:
    - CreateClassSchema: use gradeId/sectionId/subjectId instead of strings
    - List query: include Grade, Section, Subject, Faculty in select
    - Preserve existing E2E tests by keeping response shape compatible
  Time estimate: 4 hours
```

**Day 3–4: School Setup UI**

```
Task S2-06: Admin academic years page
  Owner: Engineer B
  File: src/app/admin/academic-years/page.tsx
  Components (from §5.2):
    AcademicYearList, AcademicYearCard, AcademicYearForm,
    TermList, TermForm, SetCurrentButton, LockYearButton
  Uses: TanStack Query for data fetching, shadcn Dialog for forms
  Time estimate: 6 hours

Task S2-07: Admin grades/sections/subjects page
  Owner: Engineer A
  File: src/app/admin/grades/page.tsx
  Components: GradeSectionManager (3-column layout)
  Three panels in one page — no separate routes needed for MVP
  Time estimate: 4 hours

Task S2-08: School setup / config page
  Owner: Engineer B
  File: src/app/admin/setup/page.tsx
  Components: SchoolInfoForm, SchoolConfigForm, LogoUpload
  Extends existing /admin page — move school config here
  Time estimate: 3 hours

Task S2-09: Super admin tenant onboarding wizard scaffold
  Owner: Engineer A
  File: src/app/super-admin/tenants/new/page.tsx
  Components: OnboardingWizard (3 steps: school details → admin user → config)
  Wire to POST /api/v1/tenants
  Note: Full super-admin portal is Milestone 7 — this is just the onboarding form
  Time estimate: 4 hours
```

**Day 4–5: SchoolConfig API + Sprint 2 close**

```
Task S2-10: School info + config API
  Owner: Engineer A
  Files: src/app/api/v1/school/route.ts
         src/app/api/v1/school/config/route.ts
  GET /api/v1/school → returns Tenant record for current school
  PATCH /api/v1/school → update name, phone, address, logoKey, board, medium
  GET/PATCH /api/v1/school/config → SchoolConfig fields
  Permission guard: school.edit for PATCH
  Time estimate: 3 hours

Task S2-11: Seed dev data for Sprint 2 entities
  Owner: Engineer B
  File: prisma/seeds/dev.ts
  Add to seed:
    - 5 Grades, 3 Sections, 8 Subjects
    - 1 AcademicYear (2024-25, isCurrent=true)
    - 4 Terms (FA1, FA2, SA1, SA2)
    - Update existing Class records to use new FK fields
  Time estimate: 2 hours

Task S2-12: E2E tests for Sprint 2 work
  Owner: Engineer B
  File: tests/academic-structure.test.ts
  Test cases:
    1. Create AcademicYear → set as current → verify others set to false
    2. Create 4 Terms with weightage → verify sum = 100
    3. Create AcademicYear with same name → expect 409 Conflict
    4. Create Class with gradeId/sectionId/subjectId → verify stored correctly
    5. Create duplicate Class (same grade+section+subject+year) → expect 409
    6. Admin without school.edit permission → PATCH /api/v1/school → expect 403
  Time estimate: 4 hours

Task S2-13: Sprint 2 review
  Owner: Both engineers
  Checklist:
    □ Admin can create AcademicYear + 4 Terms end-to-end via UI
    □ Admin can create Grades, Sections, Subjects via UI
    □ Class model has FK references populated for all existing records
    □ All existing E2E tests (41): PASSING
    □ New E2E tests (S2-12): PASSING
    □ prisma migrate status: clean
    □ No NULL gradeId or subjectId on any Class record
    □ Super admin can reach /super-admin/tenants/new
```

---

## 8. QA Checklist — First Three Modules

These checklists are used by QA or by the engineer before marking a milestone done. Each item has an actor, action, and expected result. Items marked `[AUTO]` should have an automated E2E test. Items marked `[MANUAL]` require human verification.

### Module 1: Migration Safety (Milestone 0)

**Tenant Isolation**
```
[AUTO]  Login as School A admin → GET /api/v1/students → response contains ONLY School A students
[AUTO]  Login as School A teacher → GET /api/v1/marks?examId={School B exam} → 404 or empty
[AUTO]  Login as School A parent → GET /api/v1/parent/children → shows ONLY School A children
[AUTO]  Unauthenticated request to any /api/v1/* → 401 response, no data leaked
[AUTO]  tenantDb() called with empty string schoolId → TypeError thrown, not silent
[MANUAL] Check: grep -r "db\." src/app/api --include="*.ts" | grep -v "tenantDb\|db\.\$" → 0 results
```

**Authentication**
```
[AUTO]  Valid email + correct password → 200, session cookie set with HMAC signature
[AUTO]  Valid email + wrong password → 401, no session cookie
[AUTO]  Expired session cookie → 401, redirect to /auth/login
[AUTO]  Session cookie tampered (invalid HMAC) → 401, redirect to /auth/login
[MANUAL] Login as each role → verify correct portal redirect:
          SUPER_ADMIN → /super-admin
          SCHOOL_ADMIN → /admin
          PRINCIPAL → /admin
          ACCOUNTANT → /admin
          CLASS_TEACHER → /faculty
          SUBJECT_TEACHER → /faculty
          PARENT → /parent (coming soon page in Sprint 1)
[MANUAL] Accountant navigates to /admin/students → verify 403 or redirect to /admin/fees
[MANUAL] Teacher navigates to /admin → verify 403 or redirect to /faculty
```

**Migrations**
```
[MANUAL] prisma migrate status → "Database schema is up to date" (no pending migrations)
[MANUAL] prisma validate → no errors
[MANUAL] COUNT(Tenant) == COUNT(DISTINCT schoolId FROM User) → must be true
[MANUAL] All User.schoolId values have a corresponding Tenant.id → no orphans
[AUTO]  All 41 pre-existing E2E tests pass
```

---

### Module 2: Academic Structure (Milestone 1)

**Academic Year**
```
[AUTO]  POST /api/v1/academic-years → creates year, returns 201
[AUTO]  POST with duplicate name for same school → 409 Conflict
[AUTO]  POST with overlapping dates → 422 with clear error message
[AUTO]  POST /api/v1/academic-years/[id]/set-current → sets isCurrent=true on target, false on all others
[AUTO]  Two concurrent set-current requests → exactly one succeeds, other gets 409
[AUTO]  POST /api/v1/academic-years/[id]/lock → isLocked=true
[AUTO]  Attempt to create Term on locked AcademicYear → 422
[MANUAL] UI: Admin creates "2024-25" year via /admin/academic-years → appears in list
[MANUAL] UI: "Set Current" button on 2023-24 year → shows confirmation dialog → confirms → 2024-25 loses current badge, 2023-24 gains it
```

**Terms**
```
[AUTO]  Create 4 Terms with weightage [20, 20, 30, 30] → sum = 100 → success
[AUTO]  Create 3 Terms with weightage [20, 30, 30] = 80 → still allowed (partial setup)
[AUTO]  POST duplicate Term name in same year → 409 Conflict
[AUTO]  GET /api/v1/academic-years/[id]/terms → returns ordered by `order` field
[MANUAL] UI: Admin creates FA1, FA2, SA1, SA2 terms → all appear in correct order → weightage displayed
[MANUAL] UI: Edit Term name → verify changes saved → reload page → change persists
```

**Grades, Sections, Subjects**
```
[AUTO]  POST /api/v1/grades → creates grade, returns 201
[AUTO]  POST /api/v1/grades with duplicate level for same school → 409
[AUTO]  DELETE /api/v1/grades/[id] → fails with 422 if Classes reference this grade
[AUTO]  DELETE /api/v1/grades/[id] → succeeds with 200 if no Classes reference it
[MANUAL] UI: Admin creates Grades (KG, Class 1–12) → all appear ordered by level
[MANUAL] UI: Admin creates Section "A", "B", "C" → appear in list
[MANUAL] UI: Admin creates Subject "Mathematics" with code "MATH" → appears in list
[AUTO]  POST /api/v1/subjects with duplicate code for same school → 409
```

**Class Refactor**
```
[AUTO]  GET /api/v1/classes → all classes have gradeId, subjectId non-null
[AUTO]  POST /api/v1/classes with gradeId + subjectId → creates correctly
[AUTO]  POST duplicate class (same grade+section+subject+year) → 409
[AUTO]  POST class with facultyId from different school → 422
[MANUAL] SQL check: SELECT COUNT(*) FROM "Class" WHERE "gradeId" IS NULL → must be 0
[MANUAL] SQL check: SELECT COUNT(*) FROM "Class" WHERE "subjectId" IS NULL → must be 0
[MANUAL] UI: Admin creates "Class 10-A Mathematics 2024-25" → appears in class list with correct Grade, Section, Subject, Teacher labels
```

---

### Module 3: Student SIS (Milestone 2)

**Student Creation (Admission Form)**
```
[AUTO]  POST /api/v1/students with all required fields → 201, admissionNo generated as "ADM-{YYYY}-{4-digit-seq}"
[AUTO]  Two concurrent student creates → two unique admissionNos generated (no collision)
[AUTO]  POST without name → 400, "name is required"
[AUTO]  POST with primaryPhone "12345" → 400, "Invalid Indian mobile number" (must be 10 digits starting with 6-9)
[AUTO]  POST with dateOfBirth in the future → 400
[AUTO]  POST with duplicate admissionNo (user-supplied) → server ignores, generates its own
[MANUAL] UI: Admin fills admission form, all required fields → submit → student appears in list with generated admissionNo
[MANUAL] UI: Admission form submit with missing name → inline error shown, no submission
[MANUAL] UI: Admission form submit with phone "12345" → inline error: "Invalid mobile number"
[MANUAL] UI: Admission form submit → success → redirected to student profile page
```

**Student Profile**
```
[AUTO]  GET /api/v1/students/[id] → returns all SIS fields including new ones
[AUTO]  GET /api/v1/students/[id] from School B while logged in as School A → 404
[AUTO]  PATCH /api/v1/students/[id] → updates name, address → 200
[AUTO]  PATCH /api/v1/students/[id] with role=CLASS_TEACHER → 403
[MANUAL] UI: Student profile → 4 tabs visible: Info, Class History, Attendance (stub), Fees (stub)
[MANUAL] UI: Info tab shows all fields. Edit button opens edit form. Save → fields updated on reload.
[MANUAL] UI: Photo upload → uploads image → thumbnail shown on profile
```

**Parent Linking**
```
[AUTO]  POST /api/v1/parents → creates parent with primaryPhone
[AUTO]  POST /api/v1/parents/[id]/link-student → creates ParentStudent record
[AUTO]  Linking same parent to same student twice → 409 Conflict
[AUTO]  POST parent with primaryPhone matching existing parent in same school → suggestion to link existing, or creates new
[MANUAL] UI: Admission form → Parent step → enter primary phone → system checks for existing parent → shows "Existing parent found: Ramesh Sharma — link?" option
[MANUAL] UI: Admin → Parents → search "Sharma" → parent appears → click to view profile → linked children shown
```

**Bulk Import**
```
[AUTO]  POST /api/v1/students/import with valid Excel file → returns preview: { valid: 45, invalid: 3, errors: [...] }
[AUTO]  POST /api/v1/students/import with invalid file type (PDF) → 400
[AUTO]  POST /api/v1/students/import with 500 valid rows → all 500 students created, no duplicates
[AUTO]  POST /api/v1/students/import with duplicate admissionNo in file → flagged in errors, not imported
[MANUAL] UI: Download Excel template → open in Excel → fill 20 students → upload → preview table shows validation result → confirm → students appear in list
[MANUAL] UI: Upload file with 3 invalid rows (missing name) → preview shows 3 red rows with error messages → valid rows shown green → confirm → only valid rows imported
```

**Class Enrollment**
```
[AUTO]  POST /api/v1/classes/[id]/students with studentId → creates ClassStudent
[AUTO]  Enroll same student in same class twice → 409 Conflict
[AUTO]  Enroll student from School B into School A class → 422
[AUTO]  Student.currentGrade updated after enrollment → GET /api/v1/students/[id] → currentGrade matches
[MANUAL] UI: Class detail page → "Add Student" → search "Priya" → shows matching students → click Add → student appears in class roster
[MANUAL] UI: Bulk enroll: select all Class 10-A students → "Enroll in all subjects" → creates ClassStudent for each subject in Grade 10-A
```

**Transfer Out**
```
[AUTO]  POST /api/v1/students/[id]/transfer-out → Student.isActive = false
[AUTO]  GET /api/v1/students?isActive=true → transferred student not included
[AUTO]  GET /api/v1/students?isActive=false → transferred student included
[AUTO]  Attempt to enroll transferred student in new class → 422 with "Student is inactive"
[MANUAL] UI: Student profile → "Transfer Out" button → dialog shows: TC Date, reason fields → confirm → student profile shows "Inactive" badge → no longer appears in active student list
[MANUAL] UI: Attendance marking → transferred student NOT shown in class roster after transfer
```
