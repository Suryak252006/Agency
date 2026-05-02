# School ERP — Implementation Specification

> **Status:** Engineering-ready. This document translates the architecture vision into
> concrete deliverables: schemas, routes, workflows, sprints, and decision records.
> The existing codebase (Next.js 15, Prisma, PostgreSQL, HMAC auth, shadcn/ui) is the
> starting point. Nothing is rebuilt from scratch.
>
> **How to use:** Each section maps to a sprint or a module owner. Read top-to-bottom for
> dependency order. Every table, route, and workflow is implementable as written.

---

## 1. Core Domain Model

### 1.1 Entity Registry

Legend:  
`[T]` = Must carry `schoolId` (tenant-scoped)  
`[A]` = Must emit an `AuditLog` entry on write  
`[E]` = Already exists in current schema (keep or extend)  
`[N]` = New table, does not exist yet

| # | Entity | [T] | [A] | [E/N] | Purpose |
|---|---|---|---|---|---|
| 1 | **Tenant** | — | ✅ | N | The school as a SaaS customer. Owns all other data. |
| 2 | **SchoolConfig** | ✅ | ✅ | N | School-level settings: grading, academic calendar, branding |
| 3 | **AcademicYear** | ✅ | ✅ | N | "2024-25". Container for all annual records |
| 4 | **Term** | ✅ | ✅ | N | FA1, SA1, Q1, Half-Yearly, Annual within an AcademicYear |
| 5 | **Grade** | ✅ | — | N | Class 1–12, KG, Nursery. Lookup table |
| 6 | **Section** | ✅ | — | N | A, B, C, Lotus. Lookup table per school |
| 7 | **Subject** | ✅ | ✅ | N | Mathematics, Hindi, EVS. Linked to Department |
| 8 | **User** | ✅ | ✅ | E | Extend: phone, isActive, lastLoginAt, avatarUrl |
| 9 | **Faculty** (Staff) | ✅ | ✅ | E | Extend: employeeId, joinDate, qualification |
| 10 | **Department** | ✅ | ✅ | E | Science, Arts, Commerce. Already solid |
| 11 | **Class** | ✅ | ✅ | E | Refactor: FK to Grade + Section + Subject + AcademicYear |
| 12 | **Student** | ✅ | ✅ | E | Major extension: full SIS fields |
| 13 | **Parent** | ✅ | ✅ | N | Father/mother/guardian record |
| 14 | **ParentStudent** | ✅ | — | N | Many-to-many: parent ↔ student with relation type |
| 15 | **ClassStudent** | ✅ | ✅ | E | Enrollment. Already exists, add academicYearId |
| 16 | **AttendanceSession** | ✅ | ✅ | N | One row per class per date. Finalized after day |
| 17 | **AttendanceRecord** | ✅ | ✅ | N | One row per student per session. PRESENT/ABSENT/LATE |
| 18 | **Exam** | ✅ | ✅ | E | Already solid. Add termId, academicYearId |
| 19 | **Marks** | ✅ | ✅ | E | Already solid. Add academicYearId, termId |
| 20 | **MarksHistory** | ✅ | — | E | Already exists. Immutable change log |
| 21 | **ReportCardConfig** | ✅ | ✅ | N | Template settings per grade per term |
| 22 | **ReportCard** | ✅ | ✅ | N | Generated output per student per term |
| 23 | **FeeCategory** | ✅ | ✅ | N | Tuition, Transport, Activity. Lookup |
| 24 | **FeeStructure** | ✅ | ✅ | N | Amount per grade per category per year |
| 25 | **StudentFeeAccount** | ✅ | ✅ | N | Total/paid/due ledger per student per year |
| 26 | **FeeInstallment** | ✅ | ✅ | N | Scheduled due amounts. Generated at year start |
| 27 | **FeeCollection** | ✅ | ✅ | N | Payment received. Generates receipt |
| 28 | **ReceiptSequence** | ✅ | — | N | Sequential receipt numbering per school per year |
| 29 | **Notice** | ✅ | ✅ | N | Announcement broadcast to roles/grades |
| 30 | **NotificationLog** | ✅ | — | N | Delivery log per channel per recipient |
| 31 | **Role** | ✅ | ✅ | E | Already solid |
| 32 | **Permission** | — | — | E | Global permission catalog |
| 33 | **RolePermission** | — | — | E | Already solid |
| 34 | **RoleAssignment** | ✅ | ✅ | E | Already solid |
| 35 | **CustomFeature** | ✅ | ✅ | E | Already solid |
| 36 | **CustomFeatureAssignment** | ✅ | ✅ | E | Already solid |
| 37 | **Request** | ✅ | ✅ | E | Already solid. Add type for attendance correction |
| 38 | **AuditLog** | ✅ | — | E | Already solid. Immutable |
| 39 | **RBACLog** | ✅ | — | E | Already solid. Immutable |
| 40 | **FileAsset** | ✅ | — | E | Already solid |
| 41 | **JobQueue** | ✅ | — | N | Background jobs: bulk PDF, bulk email |

---

### 1.2 Relationship Map

```
Tenant (1) ──────────────────────────────────────────── (*) All entities via schoolId
    │
    ├── SchoolConfig (1:1)
    ├── AcademicYear (1:*)
    │       └── Term (1:*)
    ├── Grade (1:*)
    ├── Section (1:*)
    ├── Subject (1:*) ── Department (FK, optional)
    │
    ├── User (1:*)
    │       ├── Faculty (1:1)  ── FacultyDepartment (*:*)
    │       ├── Parent (1:1, optional)
    │       └── RoleAssignment (*:*) → Role → Permission
    │
    ├── Student (1:*)
    │       ├── ClassStudent (*:*) → Class
    │       ├── ParentStudent (*:*) → Parent
    │       ├── AttendanceRecord (*) → AttendanceSession → Class
    │       ├── Marks (*) → Exam → Term → AcademicYear
    │       ├── ReportCard (*) → Term
    │       ├── StudentFeeAccount (*) → AcademicYear
    │       └── FeeInstallment (*) → FeeCategory
    │
    ├── Class (1:*)
    │       ├── FK → Grade, Section, Subject (new)
    │       ├── FK → Faculty (class teacher)
    │       ├── FK → AcademicYear (new)
    │       ├── ClassStudent (*:*) → Student
    │       ├── AttendanceSession (1:*)
    │       └── Exam (1:*)
    │
    ├── FeeCategory (1:*)
    │       ├── FeeStructure (*) → Grade + AcademicYear
    │       └── FeeInstallment (*)
    │
    └── Notice (1:*)
            └── NotificationLog (*)
```

---

### 1.3 Critical Field Definitions

#### Tenant
```
id              cuid, PK
slug            String UNIQUE — "springdale-nashik" — used in URLs, never changes
name            String — "Springdale Public School, Nashik"
board           Enum: CBSE | ICSE | STATE_BOARD | OTHER
medium          String — "English"
subscriptionTier Enum: FREE | STARTER | PROFESSIONAL | ENTERPRISE
subscriptionStatus Enum: TRIAL | ACTIVE | SUSPENDED | CHURNED
trialEndsAt     DateTime?
isActive        Boolean default true
settings        Json? — { primaryColor, secondaryColor, logoKey, academicYearStart }
```

#### AcademicYear
```
id              cuid, PK
schoolId        String, FK → Tenant [NOT NULL]
name            String — "2024-25"
startDate       DateTime — 2024-04-01
endDate         DateTime — 2025-03-31
isCurrent       Boolean — only one true per school (enforce in app layer)
isLocked        Boolean — no edits after year-end close
UNIQUE(schoolId, name)
```

#### Term
```
id              cuid, PK
schoolId        String, FK → Tenant [NOT NULL]
academicYearId  String, FK → AcademicYear
name            String — "Term 1" | "FA1" | "SA2" | "Half Yearly"
examType        Enum: FORMATIVE | SUMMATIVE | QUARTERLY | HALF_YEARLY | ANNUAL
order           Int — sequence within year (1, 2, 3, 4)
weightage       Decimal? — % contribution to final: 20, 20, 30, 30
isPublished     Boolean — controls parent visibility
UNIQUE(schoolId, academicYearId, name)
```

#### Student (extended)
```
id              cuid, PK
schoolId        String [NOT NULL]
admissionNo     String UNIQUE per school — "ADM-2024-001"
name            String
email           String? — optional for primary school
phone           String? — student's own mobile (senior classes)
dateOfBirth     DateTime
gender          Enum: MALE | FEMALE | OTHER
bloodGroup      String?
address         Json — { line1, city, state, pincode }
photo           String? — FileAsset key
category        Enum: GENERAL | OBC | SC | ST | EWS
religion        String?
motherTongue    String?
previousSchool  String?
admissionDate   DateTime
currentGrade    Int — denormalized, updated on class enrollment
currentSection  String? — denormalized
isActive        Boolean — false = transferred out (TC issued)
userId          String? FK → User — for student portal access (v2)
UNIQUE(schoolId, admissionNo)
INDEX(schoolId, currentGrade, currentSection)
INDEX(schoolId, isActive)
```

#### Parent
```
id              cuid, PK
schoolId        String [NOT NULL]
userId          String? FK → User — for portal access
fatherName      String?
motherName      String?
guardianName    String? — if neither parent
primaryPhone    String [NOT NULL] — WhatsApp number
secondaryPhone  String?
email           String?
occupation      String?
address         Json — { line1, city, state, pincode }
isActive        Boolean default true
INDEX(schoolId, primaryPhone)
```

#### FeeCollection (receipt anchor)
```
id              cuid, PK
schoolId        String [NOT NULL]
studentId       String FK → Student
academicYearId  String FK → AcademicYear
receiptNo       String UNIQUE — "RCP-2024-00001" (from ReceiptSequence)
receiptDate     DateTime
amount          Decimal — total collected
paymentMode     Enum: CASH | CHEQUE | NEFT | UPI | DEMAND_DRAFT
chequeNo        String?
bankName        String?
transactionRef  String?
collectedBy     String FK → User
isVoided        Boolean default false
voidedBy        String? FK → User
voidedAt        DateTime?
voidReason      String?
INDEX(schoolId, receiptDate)
INDEX(schoolId, studentId)
```

#### ReceiptSequence (gapless numbering)
```
id              cuid, PK
schoolId        String
academicYearId  String
prefix          String — "RCP"
lastSeq         Int default 0 — atomically incremented in transaction
UNIQUE(schoolId, academicYearId)
```
> **Implementation:** Always use `SELECT FOR UPDATE` in a transaction before incrementing.
> Never use application-level counters. This guarantees gapless sequences under concurrency.

---

## 2. Role–Permission Matrix

### 2.1 Role Definitions

| Role Key | Scope | Who holds it |
|---|---|---|
| `SUPER_ADMIN` | Platform-wide | SaaS team only |
| `SCHOOL_ADMIN` | School-wide | School owner / office manager |
| `PRINCIPAL` | School-wide | Academic head (read-heavy, approve) |
| `ACCOUNTANT` | School-wide | Fee collection only |
| `HOD` | Department | Department head (already in schema) |
| `CLASS_TEACHER` | Assigned class(es) | Marks + attendance for their class |
| `SUBJECT_TEACHER` | Assigned subject(s) | Marks only for assigned subjects |
| `PARENT` | Own children only | Read-only via parent portal |
| `STUDENT` | Own data only | Read-only (v2, not v1) |

### 2.2 Full Permission Matrix

```
MODULE / PERMISSION             SUP   ADM   PRI   ACC   HOD   C_TCH  S_TCH  PAR   STU
─────────────────────────────── ───   ───   ───   ───   ───   ─────  ─────  ───   ───
SCHOOL SETUP
  school.view                    ✅    ✅    ✅    ✅    ✅    ✅     ✅     ❌    ❌
  school.edit                    ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  school.suspend (SaaS only)     ✅    ❌    ❌    ❌    ❌    ❌     ❌     ❌    ❌

ACADEMIC YEAR & TERMS
  academic_year.view             ✅    ✅    ✅    ✅    ✅    ✅     ✅     ❌    ❌
  academic_year.create           ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  academic_year.edit             ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  academic_year.lock             ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  term.create                    ✅    ✅    ✅    ❌    ❌    ❌     ❌     ❌    ❌
  term.edit                      ✅    ✅    ✅    ❌    ❌    ❌     ❌     ❌    ❌
  term.publish                   ✅    ✅    ✅    ❌    ❌    ❌     ❌     ❌    ❌

USER MANAGEMENT
  users.view_list                ✅    ✅    ✅    ❌    ✅    ❌     ❌     ❌    ❌
  users.view_profile             ✅    ✅    ✅    ❌    ✅    ❌     ❌     ❌    ❌
  users.create                   ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  users.edit                     ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  users.deactivate               ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  users.reset_password           ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  users.impersonate              ✅    ❌    ❌    ❌    ❌    ❌     ❌     ❌    ❌

STAFF / FACULTY
  faculty.view                   ✅    ✅    ✅    ❌    ✅    ❌     ❌     ❌    ❌
  faculty.create                 ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  faculty.edit                   ✅    ✅    ❌    ❌    ✅†   ❌     ❌     ❌    ❌
  faculty.assign_class           ✅    ✅    ✅    ❌    ✅†   ❌     ❌     ❌    ❌
  faculty.deactivate             ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌

STUDENTS
  students.view_list             ✅    ✅    ✅    ✅*   ✅    ✅†    ✅†    ❌    ❌
  students.view_profile          ✅    ✅    ✅    ✅*   ✅    ✅†    ✅†    ✅‡   ✅‡
  students.create                ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  students.edit                  ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  students.bulk_import           ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  students.transfer_out          ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  students.delete                ✅    ❌    ❌    ❌    ❌    ❌     ❌     ❌    ❌

PARENTS
  parents.view                   ✅    ✅    ✅    ✅*   ❌    ❌     ❌     ❌    ❌
  parents.create                 ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  parents.edit                   ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  parents.link_student           ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌

GRADES / SECTIONS / SUBJECTS
  structure.view                 ✅    ✅    ✅    ✅    ✅    ✅     ✅     ❌    ❌
  structure.manage               ✅    ✅    ✅    ❌    ❌    ❌     ❌     ❌    ❌

CLASSES
  classes.view_all               ✅    ✅    ✅    ✅    ✅    ✅†    ✅†    ❌    ❌
  classes.create                 ✅    ✅    ✅    ❌    ❌    ❌     ❌     ❌    ❌
  classes.edit                   ✅    ✅    ✅    ❌    ✅†   ❌     ❌     ❌    ❌
  classes.delete                 ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  classes.enroll_student         ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌

ATTENDANCE
  attendance.view_school         ✅    ✅    ✅    ❌    ✅    ❌     ❌     ❌    ❌
  attendance.view_class          ✅    ✅    ✅    ❌    ✅†   ✅†    ❌     ❌    ❌
  attendance.mark                ✅    ✅    ❌    ❌    ✅†   ✅†    ❌     ❌    ❌
  attendance.edit_same_day       ✅    ✅    ❌    ❌    ✅†   ✅†    ❌     ❌    ❌
  attendance.edit_past           ✅    ✅    ❌    ❌    ✅†   ❌     ❌     ❌    ❌
  attendance.view_own_child      ❌    ❌    ❌    ❌    ❌    ❌     ❌     ✅    ❌
  attendance.export              ✅    ✅    ✅    ❌    ✅    ❌     ❌     ❌    ❌

EXAMS
  exams.view                     ✅    ✅    ✅    ❌    ✅    ✅     ✅     ❌    ❌
  exams.create                   ✅    ✅    ✅    ❌    ✅†   ❌     ❌     ❌    ❌
  exams.edit                     ✅    ✅    ✅    ❌    ✅†   ❌     ❌     ❌    ❌
  exams.delete                   ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  exams.publish                  ✅    ✅    ✅    ❌    ✅†   ❌     ❌     ❌    ❌

MARKS
  marks.view_all                 ✅    ✅    ✅    ❌    ✅†   ✅†    ✅†    ❌    ❌
  marks.enter                    ✅    ✅    ❌    ❌    ✅†   ✅†    ✅†    ❌    ❌
  marks.edit (pre-lock)          ✅    ✅    ❌    ❌    ✅†   ✅†    ✅†    ❌    ❌
  marks.request_lock             ✅    ✅    ❌    ❌    ✅†   ✅†    ✅†    ❌    ❌
  marks.approve_lock             ✅    ✅    ✅    ❌    ✅†   ❌     ❌     ❌    ❌
  marks.view_own_child           ❌    ❌    ❌    ❌    ❌    ❌     ❌     ✅    ✅

REPORT CARDS
  report_cards.configure         ✅    ✅    ✅    ❌    ❌    ❌     ❌     ❌    ❌
  report_cards.generate          ✅    ✅    ✅    ❌    ✅†   ❌     ❌     ❌    ❌
  report_cards.publish           ✅    ✅    ✅    ❌    ❌    ❌     ❌     ❌    ❌
  report_cards.view_own_child    ❌    ❌    ❌    ❌    ❌    ❌     ❌     ✅    ✅
  report_cards.export            ✅    ✅    ✅    ❌    ✅    ❌     ❌     ✅    ✅

FEE MANAGEMENT
  fees.setup_structure           ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  fees.view_all                  ✅    ✅    ✅    ✅    ❌    ❌     ❌     ❌    ❌
  fees.collect                   ✅    ✅    ❌    ✅    ❌    ❌     ❌     ❌    ❌
  fees.grant_concession          ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  fees.void_receipt              ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  fees.export_report             ✅    ✅    ✅    ✅    ❌    ❌     ❌     ❌    ❌
  fees.view_own                  ❌    ❌    ❌    ❌    ❌    ❌     ❌     ✅    ❌

NOTICES
  notices.create                 ✅    ✅    ✅    ❌    ✅†   ❌     ❌     ❌    ❌
  notices.edit_own               ✅    ✅    ✅    ❌    ✅†   ❌     ❌     ❌    ❌
  notices.delete                 ✅    ✅    ✅    ❌    ❌    ❌     ❌     ❌    ❌
  notices.publish                ✅    ✅    ✅    ❌    ✅†   ❌     ❌     ❌    ❌
  notices.view                   ✅    ✅    ✅    ✅    ✅    ✅     ✅     ✅    ✅

RBAC
  rbac.view                      ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  rbac.manage_roles              ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  rbac.assign_roles              ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  rbac.manage_custom_features    ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌

AUDIT & SETTINGS
  audit_logs.view                ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  audit_logs.export              ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  settings.view                  ✅    ✅    ✅    ✅    ✅    ✅     ✅     ❌    ❌
  settings.edit                  ✅    ✅    ❌    ❌    ❌    ❌     ❌     ❌    ❌

SUPER ADMIN (SAAS)
  tenants.view_all               ✅    ❌    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  tenants.create                 ✅    ❌    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  tenants.suspend                ✅    ❌    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  tenants.impersonate            ✅    ❌    ❌    ❌    ❌    ❌     ❌     ❌    ❌
  billing.manage                 ✅    ❌    ❌    ❌    ❌    ❌     ❌     ❌    ❌

KEY: SUP=SuperAdmin, ADM=SchoolAdmin, PRI=Principal, ACC=Accountant
     HOD=HeadOfDept, C_TCH=ClassTeacher, S_TCH=SubjectTeacher, PAR=Parent, STU=Student
     † = scoped to own department/class only
     * = limited view (name + grade + fee status for ACC; name only for relevant context)
     ‡ = own data only
```

---

## 3. MVP Workflows

### 3.1 School Onboarding
```
ACTOR: Super Admin
─────────────────────────────────────────────────────────────
1. Super Admin creates Tenant record
     → slug, name, board, medium, subscriptionTier=TRIAL, trialEndsAt=now+30d

2. Super Admin runs onboarding wizard:
   a. School details (address, phone, logo upload)
   b. Create SchoolConfig (grading system, working days, timezone)
   c. Create School Admin user (email + temp password)
   d. Send welcome email with login URL and temp password

3. School Admin logs in, forced to change password on first login
   → User.requiresPasswordChange = true (checked at login)

4. School Admin sets up school structure (can do in any order):
   a. Create Grades (Class 1–12)
   b. Create Sections (A, B, C)
   c. Create Departments (Science, Arts, Commerce)
   d. Create Subjects (Mathematics, Hindi, Physics...)

5. Create current AcademicYear ("2024-25", startDate, endDate, isCurrent=true)

6. Create Terms within AcademicYear (FA1, FA2, SA1, SA2 or equivalent)

7. Onboarding complete → School Admin dashboard unlocks
─────────────────────────────────────────────────────────────
AUDIT: Tenant.create, User.create (admin), AcademicYear.create
VALIDATION: slug must be URL-safe, unique globally; email must be unique globally
```

### 3.2 Academic Year Setup
```
ACTOR: School Admin / Principal
─────────────────────────────────────────────────────────────
1. Admin navigates to Settings → Academic Years → New Year

2. Fills: name, startDate (April 1), endDate (March 31)
   → System validates: no overlap with existing years for this school

3. Admin creates Terms for the year:
   CBSE Primary (1-8):  FA1 (Apr-Jul, 20%), FA2 (Aug-Sep, 20%),
                        SA1 (Oct, 30%), SA2 (Feb-Mar, 30%)
   CBSE Secondary (9-12): Term 1 (Aug, 50%), Term 2 (Feb, 50%)

4. Admin sets current year (isCurrent=true → sets all others to false in transaction)

5. System generates FeeInstallment records for all active students
   → Job runs: for each Student × FeeStructure → create FeeInstallment rows

6. Admin reviews fee installment schedule, adjusts if needed
─────────────────────────────────────────────────────────────
AUDIT: AcademicYear.create/update, Term.create
ROLLBACK: Do not auto-generate installments until admin explicitly triggers
```

### 3.3 Student Admission
```
ACTOR: School Admin
─────────────────────────────────────────────────────────────
1. Admin → Students → New Student

2. Admission form (required fields):
   Personal: name, dateOfBirth, gender, category
   Contact: address (line1, city, state, pincode)
   Academic: admissionDate, previousSchool?
   Parent: father/mother/guardian name, primaryPhone, email?

3. System generates admissionNo:
   Format: "ADM-{YYYY}-{SEQ:4d}" → "ADM-2024-0047"
   Sequence: per school, per year, auto-increment

4. Parent record created (or linked if phone matches existing parent)
   → ParentStudent record: relation=FATHER/MOTHER/GUARDIAN, isPrimary=true

5. Admin assigns student to class:
   → Select Grade + Section → creates ClassStudent record
   → Student.currentGrade and currentSection updated (denormalized)

6. Fee account created:
   → StudentFeeAccount for current AcademicYear
   → FeeInstallments generated from FeeStructure for student's Grade

7. Optional: photo upload → stored in FileAsset, key saved on Student

8. Welcome SMS/email to parent with student's admission number
─────────────────────────────────────────────────────────────
AUDIT: Student.create, Parent.create/link, ClassStudent.create, FeeAccount.create
VALIDATION: 
  - admissionNo generated server-side, never user-supplied
  - primaryPhone format: 10 digits, Indian numbers only
  - dateOfBirth: minimum age check (≥3 years for Nursery)
```

### 3.4 Class and Subject Assignment
```
ACTOR: School Admin / Principal / HOD
─────────────────────────────────────────────────────────────
1. Admin creates Class:
   → Grade + Section + Subject + AcademicYear + Faculty (class teacher)
   Example: "Class 10-A Mathematics 2024-25, Teacher: Ravi Kumar"

2. System prevents duplicate:
   UNIQUE(schoolId, gradeId, sectionId, subjectId, academicYearId)

3. Admin enrolls students in class:
   a. Manual: search student by name/admissionNo → add
   b. Bulk: select all students in Grade 10-A → auto-enroll in all subjects

4. Faculty assigned to class receives notification:
   "You have been assigned Class 10-A Mathematics"

5. HOD can view all classes in their department
   Admin can view all classes across school
─────────────────────────────────────────────────────────────
AUDIT: Class.create, ClassStudent.create (bulk), Faculty assignment
VALIDATION: Faculty must belong to same school; cannot assign same student to 
            same grade+section+subject twice in same year
```

### 3.5 Attendance Entry
```
ACTOR: Class Teacher
─────────────────────────────────────────────────────────────
1. Teacher navigates to My Classes → Select Class → Attendance → Today

2. System checks: does AttendanceSession exist for today?
   → If YES: load existing session (teacher is editing)
   → If NO: create new session (markedBy=teacher, date=today, isFinalized=false)

3. Teacher sees student list with toggle buttons: PRESENT / ABSENT / LATE

4. Default state: all PRESENT (bulk mark, then mark exceptions)

5. Teacher taps each absent/late student:
   → AttendanceRecord upsert: { sessionId, studentId, status }

6. Teacher clicks "Submit Attendance":
   → Session.isFinalized = true
   → Absent students queued for parent notification (in-app notice v1)

7. Teacher cannot edit after isFinalized unless HOD/Admin grants override:
   → Request type: CORRECTION_REQUEST → approved → session.isFinalized = false for 24h

8. Admin/HOD view: school-wide attendance board by class by date
─────────────────────────────────────────────────────────────
AUDIT: AttendanceSession.create/update, AttendanceRecord changes
PERFORMANCE: Use Prisma createMany() for bulk insert of records (1 query, not N)
EDGE CASES: 
  - Holidays: session not created, or created with type=HOLIDAY
  - Half-days: HALF_DAY status
  - Medical leave: MEDICAL_LEAVE status (requires document)
```

### 3.6 Marks Entry
```
ACTOR: Subject Teacher / HOD
(This workflow already exists — documenting the complete intended flow)
─────────────────────────────────────────────────────────────
1. Teacher → My Classes → Select Class → Select Exam → Enter Marks

2. Student list shown with current mark values (empty = not yet entered)

3. Teacher enters marks: 0-100 | "AB" (absent) | "NA" (not applicable)

4. Save: each mark → Marks.upsert({ examId, studentId, value, status=SUBMITTED })
         → MarksHistory entry created

5. Teacher reviews, then clicks "Request Lock":
   → All SUBMITTED marks for this exam+class → status=LOCK_PENDING
   → Admin/HOD notified

6. Admin/HOD reviews marks, then:
   APPROVE → all LOCK_PENDING → LOCKED (immutable)
   REJECT  → all LOCK_PENDING → SUBMITTED, reason stored

7. LOCKED marks: not editable by anyone except Super Admin with audit trail
─────────────────────────────────────────────────────────────
AUDIT: Every Marks.update → MarksHistory entry
SECURITY: Check schoolId on every marks query; teacher can only see their class
```

### 3.7 Report Card Generation
```
ACTOR: Admin / Principal / HOD
─────────────────────────────────────────────────────────────
PRE-CONDITIONS:
  - All marks for the term must be LOCKED
  - AttendanceSessions for the term must be finalized
  - ReportCardConfig must exist for this grade+term

1. Admin → Report Cards → Select Term + Grade → Configure

2. ReportCardConfig:
   → Template: CBSE_10_POINT | ICSE_PERCENT | CUSTOM
   → Toggle: showGrade, showRank, showAttendance, showRemarks

3. Admin clicks "Generate for Grade 10-A":
   → For each student in class:
     a. Aggregate marks across all subjects for this term
     b. Calculate percentage and grade (CBSE 10-point: A1=91-100, A2=81-90...)
     c. Calculate class rank
     d. Fetch attendance: present/total days in term
     e. Create/update ReportCard record

4. PDF generation:
   → For each ReportCard → render PDF template (school logo, student photo,
     marks table, grades, attendance, teacher remarks, principal seal)
   → Store in FileAsset, save pdfUrl on ReportCard

5. Admin reviews PDF previews, optionally edits class teacher remarks

6. Admin clicks "Publish":
   → ReportCardConfig.isPublished = true
   → Parents with children in this grade can now see report cards in parent portal

7. Parent portal shows: "Term 1 Report Card Available" notification
─────────────────────────────────────────────────────────────
AUDIT: ReportCard.generate, ReportCard.publish
PERFORMANCE: Generate PDFs in batch using JobQueue (not synchronously)
             For 60 students × 2 pages = ~120 PDF operations per class
```

### 3.8 Fee Invoice Generation
```
ACTOR: School Admin (at academic year start)
─────────────────────────────────────────────────────────────
1. Admin sets up FeeStructure for new academic year:
   → Per Grade × FeeCategory × Amount × Frequency
   Example: Class 10 → Tuition Fee → ₹8,000 → MONTHLY

2. Admin triggers "Generate Fee Schedule":
   → For each active Student:
     a. Get student's Grade
     b. Find FeeStructure rows for Grade + AcademicYear
     c. Generate FeeInstallment rows based on Frequency:
        MONTHLY → 12 installments with dueDate = 10th of each month
        QUARTERLY → 4 installments (Apr, Jul, Oct, Jan)
        ANNUAL → 1 installment (April 1)
     d. Create/update StudentFeeAccount:
        totalAmount = sum of all installments
        totalPaid = 0, totalDue = totalAmount

3. Admin can apply concessions before year begins:
   → StudentFeeAccount.concession = X
   → Regenerate affected installments

4. Fee schedule is now live — accountant can begin collections
─────────────────────────────────────────────────────────────
AUDIT: FeeStructure.create, FeeInstallment.create (batch), concession grants
PERFORMANCE: Batch insert FeeInstallments with createMany()
             For 500 students × 4 categories × 12 months = 24,000 rows — must batch
```

### 3.9 Fee Collection and Receipt
```
ACTOR: Accountant / School Admin
─────────────────────────────────────────────────────────────
1. Accountant → Fee → Collect Payment → Search student (name / admissionNo)

2. Student fee summary shown:
   → Outstanding installments (sorted by due date)
   → Concessions applied
   → Previous payment history

3. Accountant selects installments to pay (can pay multiple at once):
   → System shows total = sum of selected installments

4. Accountant fills:
   → Amount received (can be partial — triggers partial payment logic)
   → Payment mode: CASH / UPI / CHEQUE / NEFT / DD
   → Mode-specific: cheque no., bank name, transaction ref

5. On submit (database transaction, atomic):
   a. Generate receipt number: ReceiptSequence.SELECT FOR UPDATE → increment → format
   b. Create FeeCollection record
   c. For each selected installment:
      → Create FeeCollectionInstallment record
      → Update FeeInstallment.status = PAID, paidAt = now, paidAmount
   d. Update StudentFeeAccount: totalPaid += amount, totalDue -= amount
   e. Create AuditLog entry

6. Receipt PDF generated immediately:
   → School letterhead, receipt no., student name, class, amount in words, mode, date
   → Printable from browser

7. Accountant prints receipt (or sends WhatsApp image in v2)
─────────────────────────────────────────────────────────────
AUDIT: FeeCollection.create is itself the audit record
SECURITY: 
  - Receipt void requires SCHOOL_ADMIN permission (not Accountant)
  - Void creates a reversal entry, never deletes the original record
  - All void actions logged with reason
CRITICAL: The entire collection + installment update + sequence increment 
          must be ONE database transaction. Never split across requests.
```

### 3.10 Parent Portal Visibility
```
ACTOR: Parent (authenticated)
─────────────────────────────────────────────────────────────
Parent logs in via:
  Option A: Admin creates parent account, sends credentials
  Option B: Parent self-registers with phone OTP (v2)

Parent portal shows (for each linked child):
  
  Dashboard tab:
  → Child name, class, section, admissionNo, photo
  → Quick stats: attendance %, fee dues, recent marks

  Attendance tab:
  → Monthly calendar heatmap (green=present, red=absent, grey=holiday)
  → Attendance % for current term
  → Records for last 30 days

  Marks tab:
  → Marks only for LOCKED exams (SUBMITTED/LOCK_PENDING not visible to parents)
  → Sorted by term → subject → marks value
  → Grade shown alongside percentage

  Report Cards tab:
  → Only terms where ReportCardConfig.isPublished = true
  → Download PDF button per term

  Fees tab:
  → Current year fee summary: total, paid, due
  → Due installments list with due dates (highlighted if overdue)
  → Payment history with receipt download

  Notices tab:
  → All notices where targetAudience includes PARENTS or ALL
  → Grade-specific notices if child's grade matches

SECURITY RULES (enforced server-side, not just UI):
  - Every API call checks: session.userId → Parent → ParentStudent → studentId
  - Parent can NEVER see another student's data
  - Marks shown only if LOCKED
  - Report cards shown only if isPublished=true
─────────────────────────────────────────────────────────────
```

### 3.11 Notice Publishing
```
ACTOR: Admin / Principal / HOD
─────────────────────────────────────────────────────────────
1. Admin → Notices → New Notice

2. Fill:
   → Title, Body (rich text)
   → Type: ACADEMIC | EXAM | FEE | EVENT | HOLIDAY | GENERAL
   → Priority: LOW | NORMAL | HIGH | URGENT
   → Target Audience: ALL | FACULTY_ONLY | PARENTS_ONLY | SPECIFIC_GRADES
   → If SPECIFIC_GRADES: select grade(s)
   → Attachment: optional PDF upload
   → Expires At: optional (notice auto-hides after this date)

3. Save as Draft (isPublished=false)

4. Admin previews notice in context

5. Admin clicks "Publish":
   → Notice.isPublished = true, publishedAt = now
   → Email queued for all matching users (via NotificationLog)
   → In-app badge updated for matching users

6. Recipients see notice in their portal's notice feed

7. HOD can create notices visible only within their department's grade range
─────────────────────────────────────────────────────────────
AUDIT: Notice.create, Notice.publish
DELIVERY: Email via Resend (free 3k/month for v1). Queue NotificationLog entries.
          Never send email synchronously in the request handler.
```

---

## 4. API and Route Design

### 4.1 Frontend Route Map

```
PUBLIC
  /                           → Redirect to /auth/login
  /auth/login                 → Login page
  /auth/forgot-password       → Password reset request
  /auth/reset-password        → Reset with token

PARENT PORTAL  (role: PARENT)
  /parent                     → Dashboard (child selector if multiple children)
  /parent/attendance          → Attendance calendar
  /parent/marks               → Marks by term
  /parent/report-cards        → Report cards, PDF download
  /parent/fees                → Fee account, dues, receipt history
  /parent/notices             → Notice board
  /parent/profile             → Parent profile, change password

FACULTY PORTAL  (role: CLASS_TEACHER, SUBJECT_TEACHER, HOD)
  /faculty                    → Dashboard
  /faculty/classes            → My classes list
  /faculty/classes/[classId]  → Class detail (students, attendance summary)
  /faculty/attendance         → Attendance marking (date picker + class)
  /faculty/marks              → Marks entry (class + exam selector)
  /faculty/requests           → My pending requests
  /faculty/notices            → Notice board

ADMIN PORTAL  (role: SCHOOL_ADMIN, PRINCIPAL, ACCOUNTANT)
  /admin                      → Dashboard (stats, recent activity)

  /admin/setup                → School setup (name, logo, board, etc.)
  /admin/academic-years       → Academic year list
  /admin/academic-years/[id]  → Year detail + terms management
  /admin/grades               → Grade/Section/Subject management
  /admin/departments          → Department list + HOD assignment

  /admin/students             → Student list (search, filter by grade)
  /admin/students/new         → Admission form
  /admin/students/[id]        → Student profile (tabs: profile/attendance/marks/fees)
  /admin/students/[id]/edit   → Edit student
  /admin/students/import      → Bulk Excel import

  /admin/faculty              → Staff list
  /admin/faculty/new          → Add staff
  /admin/faculty/[id]         → Staff profile
  /admin/parents              → Parent list
  /admin/parents/[id]         → Parent profile + linked children

  /admin/classes              → Class list (filter by grade/year)
  /admin/classes/new          → Create class
  /admin/classes/[id]         → Class detail + student enrollment

  /admin/attendance           → School-wide attendance board
  /admin/attendance/[classId] → Class attendance history

  /admin/exams                → Exam list
  /admin/exams/new            → Create exam
  /admin/marks                → Marks oversight (class + exam)
  /admin/marks/requests       → Lock/unlock requests queue

  /admin/report-cards         → Report card management
  /admin/report-cards/config  → Configure template per grade
  /admin/report-cards/generate → Generate + publish

  /admin/fees/structure       → Fee structure setup (per grade/category)
  /admin/fees/collection      → Fee collection (accountant workflow)
  /admin/fees/collection/new  → Collect payment form
  /admin/fees/dues            → Fee dues report
  /admin/fees/receipts        → Receipt search + reprint

  /admin/notices              → Notice list
  /admin/notices/new          → Create notice
  /admin/notices/[id]/edit    → Edit draft

  /admin/roles                → RBAC roles (EXISTING, working)
  /admin/roles/custom-features → Custom features (EXISTING, working)
  /admin/logs                 → Audit logs (EXISTING, working)
  /admin/settings             → School config + integrations

SUPER ADMIN  (role: SUPER_ADMIN — separate layout)
  /super-admin                → Platform dashboard (tenant list)
  /super-admin/tenants        → All schools + subscription status
  /super-admin/tenants/new    → Onboard new school
  /super-admin/tenants/[id]   → School detail + usage + impersonate
  /super-admin/billing        → Subscription management
  /super-admin/settings       → Platform config
```

### 4.2 Backend API Route Map

All routes are prefixed `/api/v1/`. Existing `/api/` (non-versioned) routes are kept for backward compatibility but new features go into `/api/v1/`.

```
AUTH
  POST  /api/auth/login              (existing)
  POST  /api/auth/logout             (existing)
  POST  /api/auth/change-password
  POST  /api/auth/forgot-password
  POST  /api/auth/reset-password

TENANTS (Super Admin only)
  GET   /api/v1/tenants
  POST  /api/v1/tenants
  GET   /api/v1/tenants/[id]
  PATCH /api/v1/tenants/[id]
  POST  /api/v1/tenants/[id]/suspend
  POST  /api/v1/tenants/[id]/impersonate

SCHOOL SETUP
  GET   /api/v1/school
  PATCH /api/v1/school
  GET   /api/v1/school/config
  PATCH /api/v1/school/config

ACADEMIC YEARS & TERMS
  GET   /api/v1/academic-years
  POST  /api/v1/academic-years
  GET   /api/v1/academic-years/[id]
  PATCH /api/v1/academic-years/[id]
  POST  /api/v1/academic-years/[id]/set-current
  POST  /api/v1/academic-years/[id]/lock
  GET   /api/v1/academic-years/[id]/terms
  POST  /api/v1/academic-years/[id]/terms
  PATCH /api/v1/academic-years/[id]/terms/[termId]
  DELETE /api/v1/academic-years/[id]/terms/[termId]

STRUCTURE (Grades, Sections, Subjects)
  GET   /api/v1/grades
  POST  /api/v1/grades
  PATCH /api/v1/grades/[id]
  DELETE /api/v1/grades/[id]
  GET   /api/v1/sections
  POST  /api/v1/sections
  PATCH /api/v1/sections/[id]
  GET   /api/v1/subjects
  POST  /api/v1/subjects
  PATCH /api/v1/subjects/[id]
  DELETE /api/v1/subjects/[id]

DEPARTMENTS  (existing, extend)
  GET   /api/v1/departments
  POST  /api/v1/departments
  GET   /api/v1/departments/[id]
  PATCH /api/v1/departments/[id]
  DELETE /api/v1/departments/[id]

USERS
  GET   /api/v1/users                          ?role=&search=&page=
  POST  /api/v1/users
  GET   /api/v1/users/[id]
  PATCH /api/v1/users/[id]
  POST  /api/v1/users/[id]/deactivate
  POST  /api/v1/users/[id]/reset-password

FACULTY / STAFF
  GET   /api/v1/faculty                        ?departmentId=&search=
  POST  /api/v1/faculty
  GET   /api/v1/faculty/[id]
  PATCH /api/v1/faculty/[id]
  POST  /api/v1/faculty/[id]/assign-class

STUDENTS
  GET   /api/v1/students                       ?grade=&section=&search=&isActive=
  POST  /api/v1/students
  GET   /api/v1/students/[id]
  PATCH /api/v1/students/[id]
  POST  /api/v1/students/[id]/transfer-out
  POST  /api/v1/students/import                (multipart/form-data, Excel)
  GET   /api/v1/students/[id]/attendance       ?termId=&month=
  GET   /api/v1/students/[id]/marks            ?termId=
  GET   /api/v1/students/[id]/fees             ?academicYearId=
  GET   /api/v1/students/[id]/report-cards

PARENTS
  GET   /api/v1/parents                        ?search=
  POST  /api/v1/parents
  GET   /api/v1/parents/[id]
  PATCH /api/v1/parents/[id]
  POST  /api/v1/parents/[id]/link-student
  DELETE /api/v1/parents/[id]/unlink-student/[studentId]

CLASSES  (existing, extend)
  GET   /api/v1/classes                        ?gradeId=&sectionId=&subjectId=&academicYearId=
  POST  /api/v1/classes
  GET   /api/v1/classes/[id]
  PATCH /api/v1/classes/[id]
  DELETE /api/v1/classes/[id]
  GET   /api/v1/classes/[id]/students
  POST  /api/v1/classes/[id]/students          (enroll)
  DELETE /api/v1/classes/[id]/students/[studentId]  (unenroll)

ATTENDANCE
  GET   /api/v1/attendance                     ?classId=&date=&month=
  POST  /api/v1/attendance/session             (create or get session for date+class)
  PUT   /api/v1/attendance/session/[id]        (finalize session)
  GET   /api/v1/attendance/session/[id]/records
  PUT   /api/v1/attendance/session/[id]/records (bulk upsert: [{studentId, status}])
  GET   /api/v1/attendance/summary             ?classId=&termId=  (% per student)
  GET   /api/v1/attendance/school-summary      ?date=&gradeId=    (admin board)

EXAMS  (existing, extend)
  GET   /api/v1/exams                          ?departmentId=&termId=&academicYearId=
  POST  /api/v1/exams
  GET   /api/v1/exams/[id]
  PATCH /api/v1/exams/[id]
  DELETE /api/v1/exams/[id]
  POST  /api/v1/exams/[id]/publish

MARKS  (existing, extend)
  GET   /api/v1/marks                          ?examId=&classId=&status=
  PUT   /api/v1/marks                          (bulk upsert: [{studentId, value}])
  GET   /api/v1/marks/[id]/history
  POST  /api/v1/marks/request-lock
  POST  /api/v1/marks/approve-lock
  POST  /api/v1/marks/reject-lock

REPORT CARDS
  GET   /api/v1/report-cards/config            ?gradeId=&termId=
  PUT   /api/v1/report-cards/config            (upsert config)
  POST  /api/v1/report-cards/generate          { termId, gradeId } → queue job
  GET   /api/v1/report-cards/generate/status/[jobId]
  POST  /api/v1/report-cards/publish           { termId, gradeId }
  GET   /api/v1/report-cards/[studentId]       ?termId=
  GET   /api/v1/report-cards/[studentId]/[termId]/pdf  (stream PDF)

FEES
  GET   /api/v1/fees/categories
  POST  /api/v1/fees/categories
  PATCH /api/v1/fees/categories/[id]

  GET   /api/v1/fees/structure                 ?academicYearId=&gradeId=
  POST  /api/v1/fees/structure
  PATCH /api/v1/fees/structure/[id]
  POST  /api/v1/fees/structure/generate-installments  { academicYearId } → bulk job

  GET   /api/v1/fees/account/[studentId]       ?academicYearId=
  GET   /api/v1/fees/installments/[studentId]  ?academicYearId=&status=
  POST  /api/v1/fees/concession                { studentId, academicYearId, amount, note }

  POST  /api/v1/fees/collect                   (atomic: receipt + installment update)
  GET   /api/v1/fees/receipts                  ?studentId=&date=&academicYearId=
  GET   /api/v1/fees/receipts/[id]
  GET   /api/v1/fees/receipts/[id]/pdf
  POST  /api/v1/fees/receipts/[id]/void
  GET   /api/v1/fees/dues                      ?gradeId=&academicYearId= (dues report)
  GET   /api/v1/fees/summary                   ?academicYearId=          (collection summary)

NOTICES
  GET   /api/v1/notices                        ?type=&isPublished=&page=
  POST  /api/v1/notices
  GET   /api/v1/notices/[id]
  PATCH /api/v1/notices/[id]
  DELETE /api/v1/notices/[id]
  POST  /api/v1/notices/[id]/publish
  GET   /api/v1/notices/feed                   (filtered for current user's role+grade)

RBAC  (existing, extend)
  GET/POST /api/v1/rbac/roles
  GET/PATCH/DELETE /api/v1/rbac/roles/[id]
  GET/POST /api/v1/rbac/custom-features
  POST /api/v1/rbac/custom-features/assign

REQUESTS  (existing, extend)
  GET   /api/v1/requests
  POST  /api/v1/requests
  GET   /api/v1/requests/[id]
  POST  /api/v1/requests/[id]/approve
  POST  /api/v1/requests/[id]/reject

AUDIT LOGS  (existing)
  GET   /api/v1/audit-logs                     ?entity=&userId=&from=&to=

JOBS
  GET   /api/v1/jobs/[id]                      (poll job status)

HEALTH
  GET   /api/health                            (existing)

PARENT PORTAL (scoped)
  GET   /api/v1/parent/children                (list linked students)
  GET   /api/v1/parent/children/[studentId]/attendance
  GET   /api/v1/parent/children/[studentId]/marks
  GET   /api/v1/parent/children/[studentId]/report-cards
  GET   /api/v1/parent/children/[studentId]/fees
  GET   /api/v1/parent/notices
```

### 4.3 Naming Conventions

```
URL segments:        kebab-case              /academic-years, /report-cards, /fee-collection
Resource IDs:        /resource/[id]          /students/[id], /classes/[id]
Sub-resources:       /parent/[id]/children   (relationship nesting, max 2 levels deep)
Actions:             POST /resource/[id]/action  /marks/approve-lock, /notices/publish
Query params:        camelCase               ?academicYearId=&gradeId=&isActive=
Request body:        camelCase JSON          { studentId, academicYearId, amount }
Response envelope:   { data: T, meta?: Pagination, requestId: string }  (existing pattern)
Error response:      { error: string, code: string, details?: object, requestId: string }
HTTP verbs:
  GET    → read (never mutates)
  POST   → create or action
  PUT    → replace (bulk upsert for marks, attendance records)
  PATCH  → partial update
  DELETE → soft delete (isActive=false) or hard delete where appropriate
```

### 4.4 Versioning Approach

```
/api/health          → unversioned (always current)
/api/auth/*          → unversioned (auth is stable interface)
/api/v1/*            → v1 (current development)
/api/v2/*            → v2 (future, backward-compatible changes only)

RULE: Never break /api/v1/* once in production. Add /api/v2/* for breaking changes.
RULE: Deprecated routes return 200 with X-Deprecated: true header + sunset date.
```

### 4.5 Tenant Scoping Approach

```typescript
// Pattern: every route handler extracts session and passes schoolId everywhere
// lib/server/context.ts
export async function getRequestContext(request: NextRequest) {
  const session = await requireSessionUser(request);
  return {
    userId: session.userId,
    schoolId: session.schoolId,   // ← the tenant key
    role: session.role,
    permissions: session.permissions,
  };
}

// Pattern: never accept schoolId from request body/params (prevents tenant hopping)
// lib/db-tenant.ts
export function tenantQuery(schoolId: string) {
  return {
    // Proxy wrapper that injects schoolId into every where clause
    students: {
      findMany: (args = {}) => db.student.findMany({
        ...args, where: { schoolId, ...args.where }
      }),
      findFirst: (args = {}) => db.student.findFirst({
        ...args, where: { schoolId, ...args.where }
      }),
      // ... all Prisma methods for each model
    }
  };
}

// Usage in route handler:
export async function GET(request: NextRequest) {
  const ctx = await getRequestContext(request);
  const tdb = tenantQuery(ctx.schoolId);   // ← always scoped
  const students = await tdb.students.findMany({ where: { isActive: true } });
  // schoolId is injected automatically — cannot accidentally be omitted
}
```

### 4.6 Validation and Error Handling

```typescript
// Validation: Zod schemas in src/schemas/[module].ts
// All schemas colocated with module, not in one giant file

// schemas/student.ts
export const CreateStudentSchema = z.object({
  name:         z.string().min(2).max(100),
  dateOfBirth:  z.coerce.date().max(new Date()),  // coerce string → Date
  gender:       z.enum(['MALE', 'FEMALE', 'OTHER']),
  category:     z.enum(['GENERAL', 'OBC', 'SC', 'ST', 'EWS']),
  address:      AddressSchema,
  primaryPhone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
  gradeId:      z.string().cuid(),
  sectionId:    z.string().cuid().optional(),
});

// Error handling pattern (existing lib/server/api.ts — extend, not replace)
// Status codes:
//   400 → Validation error (bad request body)
//   401 → Not authenticated (no/invalid session cookie)
//   403 → Authenticated but insufficient permission
//   404 → Resource not found (always scoped by schoolId to prevent enumeration)
//   409 → Conflict (duplicate admission number, duplicate class, etc.)
//   422 → Business logic error (cannot void a voided receipt)
//   500 → Unexpected server error (log but never leak details)

// Permission check helper
export function requirePermission(ctx: RequestContext, permission: string) {
  if (!ctx.permissions.includes(permission)) {
    throw new ApiError(403, 'FORBIDDEN', `Missing permission: ${permission}`);
  }
}

// Standard route shape:
export async function POST(request: NextRequest) {
  try {
    const ctx = await getRequestContext(request);
    requirePermission(ctx, 'students.create');

    const body = await request.json();
    const data = CreateStudentSchema.parse(body);   // throws ZodError on invalid

    const student = await createStudent(ctx.schoolId, data);
    await emitAuditLog(ctx, 'student.create', 'student', student.id);

    return apiSuccess(student, ctx.requestId, 201);
  } catch (error) {
    return handleApiError(error, requestId, 'POST /students');
  }
}
```

---

## 5. Prisma Schema Plan

> New models only. Existing models (User, Faculty, Role, Permission, etc.) stay as-is
> or receive `@@map` renames. See comments for which fields extend existing models.

```prisma
// ─── ENUMERATIONS ────────────────────────────────────────────────────────────

enum SubscriptionTier {
  FREE
  STARTER        // ₹15,000/year — up to 500 students
  PROFESSIONAL   // ₹30,000/year — up to 1,500 students
  ENTERPRISE     // ₹45,000/year — unlimited
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  SUSPENDED
  CHURNED
}

enum SchoolBoard {
  CBSE
  ICSE
  STATE_BOARD
  OTHER
}

enum ExamType {
  FORMATIVE
  SUMMATIVE
  QUARTERLY
  HALF_YEARLY
  ANNUAL
  UNIT_TEST
}

enum GradingSystem {
  TEN_POINT      // CBSE: A1, A2, B1, B2, C1, C2, D, E1, E2
  PERCENTAGE     // ICSE: Marks as percentage
  LETTER         // A, B, C, D, F
  CUSTOM
}

enum SubjectType {
  MAIN
  OPTIONAL
  CO_CURRICULAR
  LANGUAGE
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
  HALF_DAY
  HOLIDAY
  MEDICAL_LEAVE
}

enum Gender {
  MALE
  FEMALE
  OTHER
}

enum StudentCategory {
  GENERAL
  OBC
  SC
  ST
  EWS
}

enum ParentRelation {
  FATHER
  MOTHER
  GUARDIAN
  OTHER
}

enum FeeFrequency {
  MONTHLY
  QUARTERLY
  HALF_YEARLY
  ANNUAL
  ONE_TIME
}

enum PaymentMode {
  CASH
  CHEQUE
  NEFT
  UPI
  DEMAND_DRAFT
}

enum InstallmentStatus {
  PENDING
  PAID
  OVERDUE
  WAIVED
  PARTIAL
}

enum ReportTemplate {
  CBSE_10_POINT
  ICSE_PERCENT
  STATE_BOARD_PERCENT
  CUSTOM
}

enum NoticeType {
  ACADEMIC
  EXAM
  FEE
  EVENT
  HOLIDAY
  GENERAL
  URGENT
}

enum NoticeAudience {
  ALL
  ADMIN_ONLY
  FACULTY
  PARENTS
  STUDENTS
  SPECIFIC_GRADES
}

enum NotificationChannel {
  EMAIL
  SMS
  WHATSAPP
  IN_APP
}

enum NotificationStatus {
  QUEUED
  SENT
  DELIVERED
  FAILED
}

enum JobType {
  PDF_BATCH
  EXCEL_EXPORT
  BULK_EMAIL
  BULK_SMS
  FEE_INSTALLMENT_GENERATION
}

enum JobStatus {
  PENDING
  RUNNING
  DONE
  FAILED
}

// ─── CORE TENANT MODEL ───────────────────────────────────────────────────────

model Tenant {
  id                 String             @id @default(cuid())
  slug               String             @unique           // "springdale-nashik"
  name               String
  address            Json?              // { line1, city, state, pincode }
  phone              String?
  email              String?
  website            String?
  logoKey            String?            // FileAsset key
  board              SchoolBoard        @default(CBSE)
  medium             String             @default("English")
  subscriptionTier   SubscriptionTier   @default(TRIAL)
  subscriptionStatus SubscriptionStatus @default(TRIAL)
  trialEndsAt        DateTime?
  isActive           Boolean            @default(true)
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  config             SchoolConfig?
  academicYears      AcademicYear[]
  grades             Grade[]
  sections           Section[]
  subjects           Subject[]
  notices            Notice[]
  feeCategories      FeeCategory[]
  jobQueue           JobQueue[]

  @@index([slug])
  @@index([subscriptionStatus])
}

model SchoolConfig {
  id                     String        @id @default(cuid())
  schoolId               String        @unique
  currentAcademicYearId  String?
  gradingSystem          GradingSystem @default(TEN_POINT)
  workingDays            Int           @default(6)
  attendanceMinPercent   Decimal?      // 75.0
  lateFeeEnabled         Boolean       @default(false)
  lateFeeAmount          Decimal?
  lateFeeGraceDays       Int?
  whatsappEnabled        Boolean       @default(false)
  smsEnabled             Boolean       @default(false)
  emailEnabled           Boolean       @default(true)
  primaryColor           String?       // "#1a56db"
  secondaryColor         String?
  academicYearStartMonth Int           @default(4)  // 4 = April
  timezone               String        @default("Asia/Kolkata")
  currency               String        @default("INR")
  updatedAt              DateTime      @updatedAt

  school Tenant @relation(fields: [schoolId], references: [id], onDelete: Cascade)
}

// ─── ACADEMIC STRUCTURE ───────────────────────────────────────────────────────

model AcademicYear {
  id        String   @id @default(cuid())
  schoolId  String
  name      String                // "2024-25"
  startDate DateTime
  endDate   DateTime
  isCurrent Boolean  @default(false)
  isLocked  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  school           Tenant              @relation(fields: [schoolId], references: [id], onDelete: Restrict)
  terms            Term[]
  classes          Class[]
  studentAccounts  StudentFeeAccount[]
  installments     FeeInstallment[]

  @@unique([schoolId, name])
  @@index([schoolId, isCurrent])
}

model Term {
  id             String   @id @default(cuid())
  schoolId       String
  academicYearId String
  name           String   // "FA1" | "Term 1" | "Half Yearly"
  examType       ExamType
  order          Int      // 1, 2, 3, 4
  weightage      Decimal? // 20.00, 20.00, 30.00, 30.00
  startDate      DateTime
  endDate        DateTime
  isPublished    Boolean  @default(false)  // Controls parent visibility
  publishedAt    DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  academicYear AcademicYear     @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
  exams        Exam[]
  reportCards  ReportCard[]
  reportConfigs ReportCardConfig[]

  @@unique([schoolId, academicYearId, name])
  @@index([schoolId, academicYearId])
  @@index([isPublished])
}

model Grade {
  id       String @id @default(cuid())
  schoolId String
  name     String // "Class 1" | "KG" | "Nursery"
  level    Int    // 0=Nursery, 1-12=Class 1-12
  order    Int    // Display sort order

  school       Tenant         @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  classes      Class[]
  feeStructures FeeStructure[]
  reportConfigs ReportCardConfig[]

  @@unique([schoolId, level])
  @@index([schoolId])
}

model Section {
  id       String @id @default(cuid())
  schoolId String
  name     String // "A" | "B" | "C" | "Lotus" | "Rose"

  school  Tenant  @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  classes Class[]

  @@unique([schoolId, name])
  @@index([schoolId])
}

model Subject {
  id           String      @id @default(cuid())
  schoolId     String
  name         String      // "Mathematics"
  code         String?     // "MATH"
  subjectType  SubjectType @default(MAIN)
  departmentId String?     // FK → Department (optional, for secondary)

  school  Tenant  @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  classes Class[]

  @@unique([schoolId, code])
  @@index([schoolId, subjectType])
}

// ─── EXTENDED CLASS MODEL ─────────────────────────────────────────────────────
// Note: Current Class model uses string fields for grade/section/subject.
// Replace with FK references in migration. Keep backward-compat data migration.

// model Class {  ← EXTEND existing model, add these fields:
//   + gradeId        String FK → Grade
//   + sectionId      String? FK → Section
//   + subjectId      String FK → Subject
//   + academicYearId String FK → AcademicYear
//   + classTeacherId String? FK → Faculty  (rename from facultyId or keep both)
//   Change UNIQUE constraint:
//   @@unique([schoolId, gradeId, sectionId, subjectId, academicYearId])
// }

// ─── EXTENDED STUDENT MODEL ──────────────────────────────────────────────────
// Note: Current Student model has: id, schoolId, email, name, rollNo, createdAt
// Migration adds all fields below. rollNo → admissionNo (rename + format change)

// model Student {  ← EXTEND existing model, add these fields:
//   + admissionNo    String      (rename/replace rollNo)
//   + phone          String?
//   + dateOfBirth    DateTime
//   + gender         Gender
//   + bloodGroup     String?
//   + address        Json
//   + photo          String?     (FileAsset key)
//   + category       StudentCategory @default(GENERAL)
//   + religion       String?
//   + motherTongue   String?
//   + previousSchool String?
//   + admissionDate  DateTime
//   + currentGrade   Int         (denormalized)
//   + currentSection String?     (denormalized)
//   + isActive       Boolean @default(true)
//   + userId         String? @unique FK → User (for student portal, v2)
//   @@unique([schoolId, admissionNo])
//   @@index([schoolId, currentGrade, currentSection])
//   @@index([schoolId, isActive])
// }

// ─── PARENT MANAGEMENT ───────────────────────────────────────────────────────

model Parent {
  id             String  @id @default(cuid())
  schoolId       String
  userId         String? @unique              // FK → User (when portal access granted)
  fatherName     String?
  motherName     String?
  guardianName   String?
  primaryPhone   String                       // WhatsApp-capable number
  secondaryPhone String?
  email          String?
  occupation     String?
  address        Json?                        // { line1, city, state, pincode }
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  children ParentStudent[]

  @@index([schoolId])
  @@index([schoolId, primaryPhone])
}

model ParentStudent {
  id        String         @id @default(cuid())
  parentId  String
  studentId String
  relation  ParentRelation
  isPrimary Boolean        @default(false)
  createdAt DateTime       @default(now())

  parent  Parent  @relation(fields: [parentId], references: [id], onDelete: Cascade)
  // student → FK → Student (existing model)

  @@unique([parentId, studentId])
  @@index([studentId])  // Find all parents of a student
}

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────

model AttendanceSession {
  id             String   @id @default(cuid())
  schoolId       String
  classId        String
  academicYearId String
  date           DateTime @db.Date          // Date only, no time
  markedBy       String                     // FK → User
  markedAt       DateTime @default(now())
  isFinalized    Boolean  @default(false)
  notes          String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  records AttendanceRecord[]

  @@unique([classId, date])
  @@index([schoolId, date])
  @@index([schoolId, classId, academicYearId])
}

model AttendanceRecord {
  id        String           @id @default(cuid())
  sessionId String
  studentId String
  status    AttendanceStatus
  remark    String?
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  session AttendanceSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@unique([sessionId, studentId])
  @@index([studentId, sessionId])
}

// ─── REPORT CARDS ─────────────────────────────────────────────────────────────

model ReportCardConfig {
  id             String         @id @default(cuid())
  schoolId       String
  academicYearId String
  termId         String
  gradeId        String
  template       ReportTemplate @default(CBSE_10_POINT)
  showGrade      Boolean        @default(true)
  showRank       Boolean        @default(false)
  showAttendance Boolean        @default(true)
  showRemarks    Boolean        @default(true)
  customConfig   Json?          // Extra fields per school
  isPublished    Boolean        @default(false)
  publishedAt    DateTime?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  term  Term  @relation(fields: [termId], references: [id], onDelete: Cascade)
  grade Grade @relation(fields: [gradeId], references: [id], onDelete: Cascade)
  reportCards ReportCard[]

  @@unique([schoolId, academicYearId, termId, gradeId])
  @@index([schoolId, termId])
}

model ReportCard {
  id             String   @id @default(cuid())
  schoolId       String
  studentId      String
  academicYearId String
  termId         String
  configId       String
  totalMarks     Decimal?
  maxMarks       Decimal?
  percentage     Decimal?
  grade          String?  // "A1" | "B2" | "PASS" | "FAIL"
  rank           Int?
  attendance     Json?    // { present: 180, total: 220, percentage: 81.8 }
  remarks        String?  // Class teacher remarks
  isGenerated    Boolean  @default(false)
  generatedAt    DateTime?
  pdfKey         String?  // FileAsset key
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  term   Term             @relation(fields: [termId], references: [id], onDelete: Cascade)
  config ReportCardConfig @relation(fields: [configId], references: [id], onDelete: Cascade)

  @@unique([studentId, termId])
  @@index([schoolId, termId])
  @@index([schoolId, studentId])
}

// ─── FEE MANAGEMENT ──────────────────────────────────────────────────────────

model FeeCategory {
  id          String  @id @default(cuid())
  schoolId    String
  name        String  // "Tuition Fee" | "Transport Fee"
  code        String? // "TUITION" | "TRANSPORT"
  isRecurring Boolean @default(true)
  isTaxable   Boolean @default(false)
  taxRate     Decimal?

  school       Tenant         @relation(fields: [schoolId], references: [id], onDelete: Restrict)
  structures   FeeStructure[]
  installments FeeInstallment[]

  @@unique([schoolId, code])
  @@index([schoolId])
}

model FeeStructure {
  id             String       @id @default(cuid())
  schoolId       String
  academicYearId String
  gradeId        String
  categoryId     String
  amount         Decimal
  frequency      FeeFrequency
  dueDay         Int?         // Day of month (1-28) for MONTHLY
  isOptional     Boolean      @default(false)
  notes          String?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  academicYear AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
  grade        Grade        @relation(fields: [gradeId], references: [id], onDelete: Cascade)
  category     FeeCategory  @relation(fields: [categoryId], references: [id], onDelete: Restrict)

  @@unique([academicYearId, gradeId, categoryId])
  @@index([schoolId, academicYearId])
}

model StudentFeeAccount {
  id             String   @id @default(cuid())
  schoolId       String
  studentId      String
  academicYearId String
  totalAmount    Decimal  @default(0)
  totalPaid      Decimal  @default(0)
  totalDue       Decimal  @default(0)  // Computed: totalAmount - totalPaid + lateFee
  concession     Decimal  @default(0)
  concessionNote String?
  lastUpdatedAt  DateTime @updatedAt

  academicYear AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)

  @@unique([studentId, academicYearId])
  @@index([schoolId, academicYearId])
}

model FeeInstallment {
  id             String            @id @default(cuid())
  schoolId       String
  studentId      String
  academicYearId String
  categoryId     String
  amount         Decimal
  dueDate        DateTime
  status         InstallmentStatus @default(PENDING)
  paidAt         DateTime?
  paidAmount     Decimal?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  academicYear AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
  category     FeeCategory  @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  collections  FeeCollectionInstallment[]

  @@index([schoolId, studentId, academicYearId])
  @@index([dueDate, status])                   // For overdue queries
  @@index([schoolId, academicYearId, status])  // For dues report
}

model ReceiptSequence {
  id             String @id @default(cuid())
  schoolId       String
  academicYearId String
  prefix         String @default("RCP")
  lastSeq        Int    @default(0)

  @@unique([schoolId, academicYearId])
}

model FeeCollection {
  id             String      @id @default(cuid())
  schoolId       String
  studentId      String
  academicYearId String
  receiptNo      String      @unique  // "RCP-2024-00001"
  receiptDate    DateTime
  amount         Decimal
  paymentMode    PaymentMode
  chequeNo       String?
  bankName       String?
  transactionRef String?
  collectedBy    String               // FK → User
  notes          String?
  isVoided       Boolean     @default(false)
  voidedBy       String?              // FK → User
  voidedAt       DateTime?
  voidReason     String?
  createdAt      DateTime    @default(now())

  installments FeeCollectionInstallment[]

  @@index([schoolId, studentId])
  @@index([schoolId, receiptDate])
  @@index([receiptNo])
}

model FeeCollectionInstallment {
  id            String  @id @default(cuid())
  collectionId  String
  installmentId String
  amountApplied Decimal

  collection  FeeCollection  @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  installment FeeInstallment @relation(fields: [installmentId], references: [id], onDelete: Restrict)

  @@unique([collectionId, installmentId])
  @@index([installmentId])
}

// ─── NOTICES ─────────────────────────────────────────────────────────────────

model Notice {
  id             String          @id @default(cuid())
  schoolId       String
  title          String
  body           String          @db.Text
  type           NoticeType      @default(GENERAL)
  priority       Int             @default(1)  // 1=LOW, 2=NORMAL, 3=HIGH, 4=URGENT
  targetAudience NoticeAudience  @default(ALL)
  gradeIds       String[]        // Populated when targetAudience=SPECIFIC_GRADES
  isPublished    Boolean         @default(false)
  publishedAt    DateTime?
  expiresAt      DateTime?
  attachmentKey  String?         // FileAsset key
  createdBy      String          // FK → User
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  school        Tenant            @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  notifications NotificationLog[]

  @@index([schoolId, isPublished, publishedAt])
  @@index([schoolId, type])
  @@index([expiresAt])
}

model NotificationLog {
  id           String              @id @default(cuid())
  schoolId     String
  noticeId     String?
  channel      NotificationChannel
  recipientId  String              // userId or phone number
  status       NotificationStatus  @default(QUEUED)
  sentAt       DateTime?
  deliveredAt  DateTime?
  error        String?
  provider     String?             // "resend", "msg91", "gupshup"
  providerRef  String?             // External message ID
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt

  notice Notice? @relation(fields: [noticeId], references: [id], onDelete: SetNull)

  @@index([schoolId, channel, status])
  @@index([noticeId])
  @@index([recipientId])
}

// ─── BACKGROUND JOBS ─────────────────────────────────────────────────────────

model JobQueue {
  id          String    @id @default(cuid())
  schoolId    String
  type        JobType
  status      JobStatus @default(PENDING)
  payload     Json
  result      Json?
  error       String?
  attempts    Int       @default(0)
  maxAttempts Int       @default(3)
  createdAt   DateTime  @default(now())
  startedAt   DateTime?
  completedAt DateTime?

  school Tenant @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@index([schoolId, status])
  @@index([status, createdAt])  // For job runner polling
}
```

---

## 6. Implementation Roadmap

### Sprint Structure
Each sprint = 2 weeks. Milestone = 1–2 sprints.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MILESTONE 0 — Migration Safety (Sprint 1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Goal: Current app is production-deployable with migration history.
No features added. Foundation only.

Sprint 1 (weeks 1-2):
  □ Convert db:push → prisma migrate
    - Run: prisma migrate dev --name init_from_current_schema
    - Commit migrations/ directory. Never edit generated files.
  □ Add Tenant model + FK migration
    - Backfill: INSERT INTO Tenant (id, slug, name) VALUES (schoolId, schoolId, 'Default School')
    - Add FK constraint from User.schoolId → Tenant.id
    - Repeat for all models with schoolId
  □ Add tenantDb() helper (lib/db-tenant.ts)
  □ Update all existing route handlers to use tenantDb()
  □ Add integration test: "Cross-tenant access returns 403 or empty" (must pass before any new code)
  □ Extend User model: + phone, isActive, lastLoginAt, avatarUrl
  □ Add new UserRole values: PRINCIPAL, ACCOUNTANT, PARENT (STUDENT in v2)
  □ Update middleware to handle new roles (route guards)
  □ All 41 existing E2E tests still pass

DELIVERABLE: Stable codebase with migration history and tenant FK integrity.
BLOCKER FOR: Everything else. Do not skip.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MILESTONE 1 — Academic Structure (Sprint 2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Goal: Admin can set up school structure — grades, sections, subjects, academic year.

Sprint 2 (weeks 3-4):
  □ AcademicYear + Term models + migration
  □ Grade + Section + Subject models + migration
  □ API: /api/v1/academic-years (CRUD + set-current + lock)
  □ API: /api/v1/academic-years/[id]/terms (CRUD)
  □ API: /api/v1/grades, /sections, /subjects (CRUD)
  □ Admin UI: /admin/academic-years (list, create, edit, terms)
  □ Admin UI: /admin/grades — manage grades/sections/subjects in one page
  □ Refactor Class model: add gradeId, sectionId, subjectId, academicYearId FKs
    - Migration: populate from existing string fields
    - Update all Class-related API routes and UI
  □ SchoolConfig model + API + admin settings page
  □ Tenant model gets onboarding wizard (/super-admin/tenants/new)

DELIVERABLE: Admin can fully set up an academic year with terms and class structure.
BLOCKER FOR: Student SIS (needs Grade), Attendance (needs Class+AcademicYear),
             Marks (needs Term+AcademicYear), Fees (needs Grade+AcademicYear)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MILESTONE 2 — Student SIS (Sprint 3–4)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Goal: Full student profiles with parent linking and class enrollment.

Sprint 3 (weeks 5-6):
  □ Student model extension migration (admissionNo, DOB, gender, address, etc.)
  □ Parent + ParentStudent models + migration
  □ admissionNo generation service (ADM-{YYYY}-{SEQ:4d}, per school per year)
  □ API: /api/v1/students (CRUD + transfer-out)
  □ API: /api/v1/parents (CRUD + link-student)
  □ Admin UI: /admin/students (list with filters: grade, section, search)
  □ Admin UI: /admin/students/new (admission form, multi-step)
  □ Admin UI: /admin/students/[id] (profile tabs: info / class / parent)

Sprint 4 (weeks 7-8):
  □ Admin UI: /admin/parents (list + profile + linked children)
  □ Student photo upload (FileAsset integration)
  □ Bulk student import: Excel template, server-side validation, import preview, commit
  □ Class enrollment UI (Admin: assign student to grade+section, bulk enroll)
  □ Student transfer-out workflow (isActive=false, TC number, date)
  □ API: /api/v1/students/import (multipart, streaming validation response)
  □ E2E tests: student CRUD, parent linking, cross-tenant isolation

DELIVERABLE: Admin can admit students, link parents, enroll in classes, import from Excel.
BLOCKER FOR: Parent Portal, Attendance, Fees

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MILESTONE 3 — Attendance (Sprint 5)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Goal: Class teacher can mark daily attendance. Admin sees school-wide view.

Sprint 5 (weeks 9-10):
  □ AttendanceSession + AttendanceRecord models + migration
  □ API: POST /api/v1/attendance/session (create-or-get for date+class)
  □ API: PUT /api/v1/attendance/session/[id]/records (bulk upsert — createMany)
  □ API: PUT /api/v1/attendance/session/[id] (finalize)
  □ API: GET /api/v1/attendance/summary (% per student per term)
  □ API: GET /api/v1/attendance/school-summary (admin board, by class by date)
  □ Faculty UI: /faculty/attendance — class picker + date + student toggle grid
  □ Admin UI: /admin/attendance — school-wide board (grade × class × date heatmap)
  □ Admin UI: /admin/students/[id] → Attendance tab (monthly calendar view)
  □ Attendance correction request flow (extend existing Request model)
  □ E2E tests: mark attendance, finalize, cannot edit after finalize

DELIVERABLE: Attendance is fully operational. Teachers mark it daily. Admin reviews it.
BLOCKER FOR: Report Cards (needs attendance data for term summary)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MILESTONE 4 — Report Cards (Sprint 6)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Goal: Admin generates and publishes PDF report cards per term.

Sprint 6 (weeks 11-12):
  □ ReportCardConfig + ReportCard models + migration
  □ Add termId to existing Exam and Marks models
  □ Grading calculation service: percentage → CBSE A1-E2 / ICSE grade / letter
  □ PDF template: @react-pdf/renderer component (school logo, marks table, grade, attendance, remarks, principal seal)
  □ API: GET/PUT /api/v1/report-cards/config
  □ API: POST /api/v1/report-cards/generate (queue JobQueue entry, return jobId)
  □ API: GET /api/v1/jobs/[id] (poll status)
  □ Job worker: poll PENDING jobs, generate PDFs, store in FileAsset, update ReportCard
  □ API: POST /api/v1/report-cards/publish
  □ API: GET /api/v1/report-cards/[studentId]/[termId]/pdf (stream PDF)
  □ Admin UI: /admin/report-cards (configure + generate + publish per grade per term)
  □ E2E tests: generate report card, verify PDF URL, publish, check parent visibility

DELIVERABLE: Full report card generation pipeline. PDFs downloadable by admin and parents.
BLOCKER FOR: Parent Portal (needs published report cards)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MILESTONE 5 — Fee Management (Sprint 7–8)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Goal: Complete fee lifecycle: setup → installments → collect → receipt → dues.

Sprint 7 (weeks 13-14):
  □ FeeCategory + FeeStructure + StudentFeeAccount + FeeInstallment models + migration
  □ ReceiptSequence model (gapless numbering)
  □ FeeCollection + FeeCollectionInstallment models + migration
  □ Fee structure setup API + UI (/admin/fees/structure)
  □ Installment generation: bulk createMany() from FeeStructure × active students
  □ API: /api/v1/fees/structure (CRUD)
  □ API: /api/v1/fees/account/[studentId] + installments
  □ API: POST /api/v1/fees/concession
  □ Admin UI: /admin/fees/structure — per grade per category amount grid

Sprint 8 (weeks 15-16):
  □ API: POST /api/v1/fees/collect (atomic transaction)
  □ Receipt PDF template (school letterhead, receipt no., amount in words, signature)
  □ API: GET /api/v1/fees/receipts/[id]/pdf (stream receipt)
  □ API: POST /api/v1/fees/receipts/[id]/void
  □ API: GET /api/v1/fees/dues (dues report — filter by grade, category, overdue)
  □ API: GET /api/v1/fees/summary (collection dashboard data)
  □ Admin UI: /admin/fees/collection — accountant workflow (search student → pay → print)
  □ Admin UI: /admin/fees/dues — dues report with export (CSV)
  □ Admin UI: /admin/fees/receipts — search + reprint
  □ Accountant role: restricted to fee pages only (enforced via middleware)
  □ E2E tests: fee collection transaction, receipt uniqueness, void flow

DELIVERABLE: Full fee management. Accountant can collect, print receipts, see dues.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MILESTONE 6 — Parent Portal + Notices (Sprint 9)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Goal: Parents can log in and see their child's full academic picture.

Sprint 9 (weeks 17-18):
  □ Parent user account creation (admin-generated, credentials sent via email)
  □ Parent session: same HMAC cookie, role=PARENT, links to Parent.userId
  □ Parent portal layout (/parent/* — new layout, no sidebar items for admin)
  □ API: /api/v1/parent/* routes (child-scoped, strict ownership check)
  □ Parent UI: dashboard, attendance calendar, marks, report cards, fees, notices
  □ Notice + NotificationLog models + migration
  □ API: /api/v1/notices (CRUD + publish + feed)
  □ Admin UI: /admin/notices (list + create + publish)
  □ Faculty UI: notices feed
  □ Email delivery via Resend on notice publish (async, via NotificationLog queue)
  □ E2E tests: parent cannot access other children, marks hidden until LOCKED,
               report cards hidden until published, fee receipts scoped to own child

DELIVERABLE: Parent portal live. Notices working. Email delivery on notice publish.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MILESTONE 7 — Super Admin + SaaS Operations (Sprint 10)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Goal: SaaS team can onboard schools, manage subscriptions, impersonate.

Sprint 10 (weeks 19-20):
  □ Super admin layout (/super-admin/* — completely separate, no school data leakage)
  □ Tenant list: name, slug, plan, student count, last activity, status
  □ Onboarding wizard: create Tenant → create Admin user → seed config → send email
  □ Tenant detail: usage metrics (users, students, API calls, storage)
  □ Impersonation: super admin → logs in as school admin (audit logged, auto-expires 1h)
  □ Subscription status management (TRIAL → ACTIVE, SUSPEND, CHURN)
  □ Trial expiry: school access blocked gracefully after trialEndsAt (not hard delete)
  □ Subscription gate middleware: check Tenant.subscriptionStatus on every request
  □ E2E tests: super admin cannot access school data directly, impersonation creates audit log

DELIVERABLE: SaaS operations team can manage schools end-to-end.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MILESTONE 8 — Hardening + Pilot (Sprint 11)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Goal: Production-ready. Onboard 3 pilot schools. Gather feedback.

Sprint 11 (weeks 21-22):
  □ Rate limiting on auth + fee endpoints (prevent brute force, duplicate receipts)
  □ Load test: 50 concurrent teachers marking attendance (target: < 500ms p95)
  □ Load test: fee collection with concurrent receipt generation (target: no duplicates)
  □ E2E test coverage: target 80+ tests (from current 41)
  □ Admin user guide (Notion doc or PDF)
  □ Accountant cheat sheet (A4 laminated card for school office)
  □ Onboard 3 pilot schools (free 90-day trial)
  □ Feedback collection: weekly call + in-app feedback button
  □ Fix top 10 pilot feedback items
  □ Go-live checklist pass (see GO_LIVE_CHECKLIST.md)

DELIVERABLE: v1 ERP live, 3 paying pilots, feedback loop established.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: ~22 weeks, 1-2 engineers
Parallelizable: M3+M4 can overlap (attendance week 9, report cards week 11)
                M5 Sprint 7 and M6 can partially overlap
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Dependency Graph
```
M0 (Migration Safety)
  └── M1 (Academic Structure)
        ├── M2 (Student SIS)
        │     ├── M3 (Attendance) ─────────────────────┐
        │     │                                         │
        │     ├── M4 (Report Cards) ← M3 (attendance)  │
        │     │                                         │
        │     └── M5 (Fee Management)                   │
        │                                               │
        └──────────────────────── M6 (Parent Portal) ←─┘
                                      ← M4 (report cards)
                                      ← M5 (fees)

M7 (Super Admin) — parallel to M2 onward, only needs M0+M1
M8 (Hardening) — sequential after all above
```

---

## 7. Risks

### Technical Risks

**T1 — Schema migration breaks existing data**
*Risk:* The Class model refactor (adding gradeId/sectionId FKs) requires a data migration
that populates new FK columns from old string columns. If grade names in the DB don't
match Grade records exactly, FK assignment fails and existing classes are orphaned.
*Mitigation:* Write migration as two steps: (1) add nullable FK columns, (2) populate from
a lookup, (3) verify 100% populated, (4) add NOT NULL constraint. Never combine in one step.
Run against a DB backup before running on production.

**T2 — Receipt number race condition**
*Risk:* Two concurrent fee collections generate the same receipt number.
*Mitigation:* Use `SELECT FOR UPDATE` on ReceiptSequence row inside a transaction.
Prisma: `db.$transaction([db.$queryRaw\`SELECT ... FOR UPDATE\`, ...])`.
Never use application-level MAX(receiptNo)+1. Test with 10 concurrent collection requests.

**T3 — Bulk operations timing out**
*Risk:* Fee installment generation for 500 students × 4 categories × 12 months = 24,000 rows.
If done synchronously, the HTTP request will timeout.
*Mitigation:* Use JobQueue table. POST /fees/structure/generate-installments → create JobQueue entry → return 202 Accepted with jobId. Poll GET /jobs/[id] from UI. Run job in background (cron endpoint or Replit background worker).

**T4 — PDF generation memory spike**
*Risk:* Generating 60 report card PDFs synchronously in one request crashes the Node process.
*Mitigation:* Always queue PDFs via JobQueue. Generate one at a time in the worker. Stream to FileAsset (Supabase Storage or Replit Object Storage) instead of buffering in memory.

**T5 — tenantDb() wrapper divergence**
*Risk:* tenantDb() wraps models manually. As new models are added, developers forget to add them to the wrapper, bypass it with direct `db.*` calls, and introduce tenant-isolation bugs.
*Mitigation:* Add a Prisma middleware extension (Prisma client extensions v5) that
intercepts every query and checks for `schoolId` in the where clause. If missing and the model has a schoolId field, throw an error in non-production and log a warning in production.

**T6 — Attendance bulk insert is N queries**
*Risk:* Marking attendance for 60 students with a loop of individual `upsert` calls = 60 DB round-trips. At 50ms each = 3 seconds.
*Mitigation:* Use `db.attendanceRecord.createMany({ data: [...], skipDuplicates: true })`
followed by `updateMany` for changes. Target: < 200ms for 60 records.

**T7 — Cross-portal data leakage via shared API routes**
*Risk:* Parent calls `/api/v1/students/[id]` with another student's ID and sees their data
if only UI guards are in place.
*Mitigation:* Every parent-facing API route must verify:
`ParentStudent.exists({ where: { parentId: ctx.parentId, studentId: params.id } })`
This check must be in the API route handler, never only in middleware.

### Product Risks

**P1 — Building for the wrong school type first**
*Risk:* If pilot schools are ICSE schools and you built CBSE-specific grading, report cards are unusable. They churn. You lose confidence.
*Mitigation:* Confirm board type before onboarding pilots. Build GradingSystem as a configurable enum (already in SchoolConfig). Never hardcode CBSE logic — always go through the grading service that reads from config.

**P2 — Accountant won't use a system that prints ugly receipts**
*Risk:* If the fee receipt PDF looks amateur, accountants will continue using their receipt book and the fee module adoption rate is 0%.
*Mitigation:* Get a sample receipt from a target school. Match it exactly. Include: school logo, receipt number in bold, student name, class, amount in words (₹ Eight Thousand Only), mode of payment, date, cashier name, stamp area. Show it to an accountant before writing a line of code.

**P3 — Attendance data not trusted because teachers mark it late**
*Risk:* Teachers often mark attendance the next day or in batches. If past-day editing is restricted, they create workarounds. If past-day editing is open, data integrity is lost.
*Mitigation:* Allow same-day editing freely. Allow past-day editing for CLASS_TEACHER up to 24h. Allow past-day editing for HOD up to 7 days. Any edit > 24h creates an audit log entry and notification to admin. This mirrors how most Indian schools handle corrections.

**P4 — Fee concessions creating accounting gaps**
*Risk:* If concessions are applied after installments are generated, the installment amounts and StudentFeeAccount totals fall out of sync.
*Mitigation:* Concessions must regenerate affected installments in the same transaction. Define a recalculateFeeAccount() service function that is called after any concession change. Never update totalDue directly — always compute it from installments.

**P5 — Parents logging in during exam results season**
*Risk:* All parents log in at once when report cards are published. If the DB cannot handle the spike, the parent portal goes down on the most important day of the year.
*Mitigation:* Report cards are static PDFs in object storage — parents download from FileAsset URL, not from the DB. The parent portal API for marks/attendance uses database indexes correctly (always scoped by schoolId + studentId). Load test before first publish event.

**P6 — Academic year rollover is not designed**
*Risk:* At year end, students in Class 10-A must move to Class 11-A (or leave). If this isn't modeled, the admin has to re-enroll every student manually — 500 students × 10 minutes = 83 hours.
*Mitigation:* Build a year-end rollover wizard: "Promote all students in Class X to Class X+1. Students in Class 12 are marked as graduated (isActive=false)." This is a batch operation. Include it in Milestone 2 design even if the UI ships in Milestone 8.

**P7 — WhatsApp DLT registration takes 4-6 weeks in India**
*Risk:* You promise WhatsApp notifications to schools during sales. DLT approval delays launch.
*Mitigation:* Register for DLT (TRAI's Distributed Ledger Technology system) on Day 1 of
development. It runs in parallel. Use MSG91 for registration — they have a managed service. Build the WhatsApp channel in v2 but start the registration process in M0.

**P8 — Ignoring the principal persona**
*Risk:* The principal has read access everywhere but no entry point designed for them. They open the app and don't know what to look at.
*Mitigation:* The Principal dashboard is different from the Admin dashboard. Principal sees: today's school-wide attendance %, pending marks lock requests, overdue fee % by grade, upcoming exams this week, recent notices. This is a reporting dashboard, not an operations dashboard. Design it separately in M6.
