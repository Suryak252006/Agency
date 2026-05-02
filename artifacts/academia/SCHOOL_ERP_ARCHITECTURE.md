`-scoped multi-tenancy). Every recommendation builds on or extends
> what already exists. Nothing here starts from scratch.
>
> **Audience:** Founding engineering team, product owner, future contractors.

---

## A. Product Vision

**One sentence:** The affordable, no-training-needed ERP for Indian K-12 schools that replaces
WhatsApp groups, paper registers, and Excel fee sheets with a single system that works on
a ₹5,000 Android phone.

**Who we are NOT building for (v1):**
- International schools (IB, IGCSE) — different grading, different workflows
- Universities and colleges — completely different domain
- Schools with existing SAP/Oracle ERP — not the market

**Who we ARE building for:**
- CBSE/ICSE/State board schools, classes 1–12
- 200–2000 student enrolment
- Tier-2 and tier-3 cities (Nashik, Surat, Coimbatore, Indore, Bhopal, Kanpur)
- Schools currently using Tally for fees, WhatsApp for communication, Google Sheets for marks
- Price point: ₹15,000–₹45,000/year per school (₹1,250–₹3,750/month)

---

## B. ERP Module Map

### Version Boundaries

```
V1 — Foundation (Build this. Ship this. Get paying schools on this.)
┌─────────────────────────────────────────────────────────────────┐
│  Tenant onboarding    School setup / academic year / terms       │
│  User management      Admin, Faculty, Student, Parent accounts   │
│  Student SIS          Full profiles, admission no., enrollment   │
│  Attendance           Class-wise daily, absent alerts            │
│  Marks & Exams        Already exists — extend + report cards     │
│  Fee management       Fee structure, collection, receipts, dues  │
│  Parent portal        Marks, attendance, fee dues, notices       │
│  Notices              In-app broadcasts + email                  │
│  Report cards         PDF generation per student per term        │
│  Admin dashboard      Metrics: attendance %, fee collection %    │
│  Audit logs           Already exists — extend                    │
└─────────────────────────────────────────────────────────────────┘

V2 — Depth (After 10+ paying schools. Driven by their feedback.)
┌─────────────────────────────────────────────────────────────────┐
│  WhatsApp/SMS         MSG91 or Twilio for parent alerts          │
│  Advanced fees        Installment plans, concessions, transport  │
│  Timetable            Period scheduling, room/teacher allocation  │
│  Staff HR             Staff attendance, leave requests           │
│  Bulk import/export   Excel import for students, marks, fees     │
│  Advanced analytics   Attendance trends, fee recovery, topper    │
│  Certificate gen      Bonafide, TC, Character certificates       │
│  Library module       Book catalog, issue/return tracking        │
└─────────────────────────────────────────────────────────────────┘

V3 — Scale (After product-market fit is confirmed.)
┌─────────────────────────────────────────────────────────────────┐
│  Online admissions    Enquiry → application → admission workflow │
│  Online fee payment   Razorpay / PayU integration               │
│  Multi-branch         Same school, multiple campuses            │
│  Student mobile app   React Native / Expo parent + student app  │
│  Hall tickets         Exam seating plans, admit cards           │
│  Inventory            Lab, sports, stationery stock             │
│  AI insights          At-risk student detection, fee defaulters  │
│  Open API             Webhooks for third-party integrations      │
└─────────────────────────────────────────────────────────────────┘
```

### Module Ownership Map

| Module | V1 | V2 | V3 | Uses existing? |
|---|---|---|---|---|
| School Setup & Onboarding | ✅ | — | — | Partial (schoolId exists, no Tenant model) |
| Academic Year & Terms | ✅ | — | — | No — add new |
| User Management | ✅ | — | — | Yes — User model, extend roles |
| Student SIS | ✅ | — | — | Partial (Student model is thin) |
| Parent Management | ✅ | — | — | No — add Parent + ParentStudent |
| Staff / Faculty | ✅ | — | — | Yes — Faculty model, extend |
| Class / Section / Subject | ✅ | — | — | Partial (Class has section, no Subject model) |
| Attendance | ✅ | — | — | No — add Attendance |
| Exams & Marks | ✅ | — | — | Yes — already solid |
| Report Cards | ✅ | — | — | No — add ReportCard |
| Fee Management | ✅ | — | — | No — add full fee module |
| Notices | ✅ | — | — | No — add Notice model |
| RBAC | ✅ | — | — | Yes — very well designed already |
| Audit Logs | ✅ | — | — | Yes — already exists |
| WhatsApp / SMS | — | ✅ | — | No |
| Timetable | — | ✅ | — | No |
| Staff HR | — | ✅ | — | No |
| Bulk Import / Export | — | ✅ | — | No |
| Online Fee Payment | — | — | ✅ | No |
| Multi-branch | — | — | ✅ | No |
| Student Mobile App | — | — | ✅ | No |

---

## C. Recommended Stack

### Keep (already in codebase, working well)

| Layer | Current choice | Keep? | Reason |
|---|---|---|---|
| Framework | Next.js 15 App Router | ✅ Yes | Well-structured, SSR for PDF/reports |
| ORM | Prisma 5 | ✅ Yes | Type-safe, migration support needed |
| Database | PostgreSQL (Replit) | ✅ Yes | Upgrade to Neon/Supabase DB for prod |
| Auth | HMAC cookie sessions | ✅ Yes | Extend for parent/student roles |
| UI | shadcn/ui + Radix | ✅ Yes | Complete and consistent |
| State | TanStack Query v5 | ✅ Yes | Already in use |
| Validation | Zod | ✅ Yes | Already in use |
| Testing | Vitest + E2E | ✅ Yes | 41 tests passing |

### Add for ERP

| Need | Recommendation | Why |
|---|---|---|
| PDF generation | `@react-pdf/renderer` | Report cards, receipts — server-side |
| Email | Resend (free 3k/mo) | Notices, password reset |
| WhatsApp (v2) | MSG91 or Gupshup | Both have Indian pricing, DLT registered |
| SMS (v2) | MSG91 | Most common in Indian ed-tech |
| File storage | Supabase Storage or Replit Object Storage | Already in FileAsset model |
| Background jobs | Custom queue with Prisma (v1), BullMQ v2 | Report generation, bulk email |
| Schema migrations | Switch from `db:push` → `prisma migrate` | Required for safe prod deployments |
| Caching | In-memory (v1), Redis (v2) | Dashboard aggregations |
| Analytics | Custom (v1), Metabase embed (v2) | Reports dashboard |

### NOT recommended (common mistakes)

| Don't use | Use instead | Why |
|---|---|---|
| Supabase Auth | Keep HMAC sessions | Already works; Supabase Auth is overkill here |
| GraphQL | REST with versioning | Team knows REST, added complexity |
| Microservices | Modular monolith | Wrong scale for v1 |
| Separate mobile app (v1) | Responsive web | Ship faster; add Expo in v3 |
| NextAuth | Keep current auth | Custom auth is simpler for multi-tenant |

---

## D. System Architecture

### Multi-Tenant Model: Shared Schema (Pool Model)

```
                        ┌──────────────────────────────┐
                        │       DNS / Load Balancer     │
                        │  *.schoolerp.in / schoolerp.in│
                        └──────────────┬───────────────┘
                                       │
                        ┌─────────────▼───────────────┐
                        │    Next.js App (single app)  │
                        │                              │
                        │  ┌─────────────────────────┐ │
                        │  │   Tenant Resolution      │ │
                        │  │  subdomain / header /   │ │
                        │  │  session cookie          │ │
                        │  └──────────┬──────────────┘ │
                        │             │                 │
                        │  ┌─────────▼──────────────┐  │
                        │  │   Middleware (Edge)      │  │
                        │  │  - Auth check            │  │
                        │  │  - Tenant inject         │  │
                        │  │  - Role guard            │  │
                        │  └──────────┬──────────────┘  │
                        └────────────┼─────────────────┘
                                     │
                 ┌───────────────────┼──────────────────┐
                 │                   │                  │
        ┌────────▼───────┐  ┌───────▼───────┐  ┌──────▼──────┐
        │  Admin Portal  │  │ Faculty Portal │  │Parent Portal│
        │  /admin/*      │  │ /faculty/*     │  │ /parent/*   │
        └────────┬───────┘  └───────┬───────┘  └──────┬──────┘
                 └───────────────────┴──────────────────┘
                                     │
                        ┌────────────▼────────────────┐
                        │        API Routes             │
                        │    /api/v1/* (versioned)      │
                        │                              │
                        │  Every query scoped by:       │
                        │  WHERE schoolId = session.tenantId│
                        └────────────┬────────────────┘
                                     │
                        ┌────────────▼────────────────┐
                        │     PostgreSQL (shared)      │
                        │                              │
                        │  All rows carry schoolId     │
                        │  Indexes: (schoolId, ...)    │
                        │  RLS policies (optional)     │
                        └─────────────────────────────┘
```

### Tenant Isolation Strategy

**Current:** `schoolId: String` on every model — correct approach, keep it.

**Evolution — add a `Tenant` model:**
```
Tenant (school) has:
  id (cuid)          ← this becomes the canonical schoolId
  slug               ← "dav-nashik" → subdomain or URL path
  name               ← "DAV Public School, Nashik"
  subscriptionTier   ← FREE | STARTER | PROFESSIONAL | ENTERPRISE
  subscriptionStatus ← TRIAL | ACTIVE | SUSPENDED | CHURNED
  trialEndsAt        ← 30-day free trial
  settings           ← JSON (branding, academic config)
  isActive           ← soft disable without data loss
```

**Tenant injection in middleware (current pattern, extend it):**
```typescript
// Current: session.schoolId comes from the session cookie
// New: also resolve from subdomain for branded URLs
// middleware.ts:
const tenantId = resolveTenant(request);
// 1. From session cookie (already working)
// 2. From subdomain: "dav-nashik.schoolerp.in" → find Tenant by slug
// 3. Fail-closed: if no tenant, redirect to /login
```

**Every Prisma query must be tenant-scoped:**
```typescript
// CORRECT — tenant filter always present
const students = await db.student.findMany({
  where: { schoolId: session.tenantId, ... }
});

// WRONG — never query without schoolId
const students = await db.student.findMany(); // ← security hole
```

**Add a lint rule / DB helper to enforce this:**
```typescript
// lib/db-tenant.ts
export function tenantDb(schoolId: string) {
  return {
    student: {
      findMany: (args) => db.student.findMany({
        ...args, where: { ...args.where, schoolId }
      }),
      // ... wrap all models
    }
  };
}
```

### Request Flow with Tenant Context

```
Request → Middleware
  → Extract session cookie → verify HMAC → get { userId, schoolId, role }
  → Attach to request headers: x-tenant-id, x-user-id, x-user-role
  → Route handler reads from session (never from request body/params)
  → DB query always includes WHERE schoolId = session.schoolId
  → Response (never leaks cross-tenant data)
```

### Background Job Architecture (v1 simple, v2 queue)

**V1 — Synchronous with streaming response:**
- PDF report cards: generate on-demand, stream to browser
- Fee receipts: generate on POST /fee/payment, return PDF URL

**V2 — Queue-based:**
- Bulk WhatsApp sends (rate-limited by MSG91)
- Bulk PDF generation for report cards (200 students × 3 terms)
- Excel export for large datasets
- Use: Simple Prisma-backed job queue (JobQueue table) + cron endpoint

```
JobQueue table:
  id, tenantId, type (BULK_SMS | PDF_BATCH | EXCEL_EXPORT)
  status (PENDING | RUNNING | DONE | FAILED)
  payload JSON, result JSON, createdAt, startedAt, completedAt
```

---

## E. Core Database Schema

### What stays (already in schema, well-designed)
- `User`, `Role`, `Permission`, `RolePermission`, `RoleAssignment`
- `CustomFeature`, `CustomFeatureAssignment`, `RBACLog`
- `Department`, `Faculty`, `FacultyDepartment`
- `Class`, `ClassStudent`, `Student`
- `Exam`, `Marks`, `MarksHistory`
- `Request`, `AuditLog`, `FileAsset`

### What changes (extend existing tables)

```
User — add:
  + phone          String?          // For SMS/WhatsApp OTP
  + avatarUrl      String?
  + isActive       Boolean default true
  + lastLoginAt    DateTime?
  + passwordReset  { token, expiresAt }?

Student — currently very thin, needs full SIS:
  + admissionNo    String           // School-specific admission number
  + dateOfBirth    DateTime
  + gender         Gender (MALE/FEMALE/OTHER)
  + bloodGroup     String?
  + address        Json             // { line1, city, state, pincode }
  + phone          String?          // Student's own phone (for senior classes)
  + photo          String?          // fileAsset key
  + category       StudentCategory  // GENERAL/OBC/SC/ST/EWS (for Indian reservations)
  + religion       String?
  + motherTongue   String?
  + previousSchool String?
  + admissionDate  DateTime
  + currentGrade   Int              // Denormalized for fast queries
  + currentSection String?          // Denormalized
  + isActive       Boolean          // For TC/transfer outs
  + userId         String?          // When student gets portal access

Class — currently flat, needs restructuring:
  + academicYearId String           // Which academic year
  + gradeId        String           // FK to Grade
  + sectionId      String?          // FK to Section
  + subjectId      String?          // FK to Subject (class = grade+section+subject combo)
  + classTeacherId String?          // Class teacher (for attendance)
  + roomNo         String?          // Physical room
```

### What's new (add these tables)

```sql
-- ════════════════════════════════════════════════════════════════
-- TENANT / SCHOOL SETUP
-- ════════════════════════════════════════════════════════════════

Tenant {
  id               cuid PK
  slug             String UNIQUE        -- "dav-nashik"
  name             String               -- "DAV Public School"
  address          Json                 -- { street, city, state, pincode }
  phone            String?
  email            String?
  website          String?
  logoUrl          String?
  board            SchoolBoard          -- CBSE | ICSE | STATE_BOARD | OTHER
  medium           String               -- "English" | "Hindi" | "Regional"
  type             SchoolType           -- DAY | RESIDENTIAL | SEMI_RESIDENTIAL
  subscriptionTier SubscriptionTier     -- FREE | STARTER | PROFESSIONAL | ENTERPRISE
  subscriptionStatus SubscriptionStatus -- TRIAL | ACTIVE | SUSPENDED | CHURNED
  trialEndsAt      DateTime?
  isActive         Boolean default true
  settings         Json?                -- Branding, academic preferences
  createdAt        DateTime
  updatedAt        DateTime
}

AcademicYear {
  id          cuid PK
  schoolId    String FK → Tenant
  name        String               -- "2024-25"
  startDate   DateTime             -- April 1, 2024
  endDate     DateTime             -- March 31, 2025
  isCurrent   Boolean default false -- Only one current per school
  isLocked    Boolean default false -- Prevent edits after year close
  createdAt   DateTime

  UNIQUE(schoolId, name)
}

Term {
  id             cuid PK
  schoolId       String FK → Tenant
  academicYearId String FK → AcademicYear
  name           String           -- "Term 1" | "FA1" | "SA2" | "Q1"
  examType       ExamType         -- FORMATIVE | SUMMATIVE | QUARTERLY | HALF_YEARLY | ANNUAL
  startDate      DateTime
  endDate        DateTime
  weightage      Decimal?         -- % contribution to final grade
  isPublished    Boolean default false
  order          Int              -- Sequence within year: 1, 2, 3, 4
  createdAt      DateTime

  UNIQUE(schoolId, academicYearId, name)
}

Grade {
  id       cuid PK
  schoolId String FK → Tenant
  name     String    -- "Class 1" | "Class 12" | "KG" | "Nursery"
  level    Int       -- 0=Nursery, 1-12=Class 1-12, for sorting
  order    Int       -- Display order
  UNIQUE(schoolId, level)
}

Section {
  id       cuid PK
  schoolId String FK → Tenant
  name     String    -- "A" | "B" | "C" | "Lotus" | "Rose"
  UNIQUE(schoolId, name)
}

Subject {
  id           cuid PK
  schoolId     String FK → Tenant
  name         String    -- "Mathematics" | "Hindi" | "EVS"
  code         String?   -- "MATH", "HIN", "EVS"
  subjectType  SubjectType -- MAIN | OPTIONAL | CO_CURRICULAR | LANGUAGE
  departmentId String?   -- FK → Department (for secondary onwards)
  UNIQUE(schoolId, code)
}

-- ════════════════════════════════════════════════════════════════
-- PARENT MANAGEMENT
-- ════════════════════════════════════════════════════════════════

Parent {
  id           cuid PK
  schoolId     String FK → Tenant
  userId       String? FK → User     -- When parent has portal access
  fatherName   String?
  motherName   String?
  guardianName String?                -- For cases where neither parent is guardian
  primaryPhone String                 -- WhatsApp number
  secondaryPhone String?
  email        String?
  occupation   String?
  address      Json                   -- { line1, city, state, pincode }
  isActive     Boolean default true
  createdAt    DateTime
  updatedAt    DateTime

  INDEX(schoolId)
  INDEX(primaryPhone)
}

ParentStudent {
  id          cuid PK
  parentId    String FK → Parent
  studentId   String FK → Student
  relation    ParentRelation  -- FATHER | MOTHER | GUARDIAN | OTHER
  isPrimary   Boolean default false  -- Primary contact for this student
  createdAt   DateTime

  UNIQUE(parentId, studentId)
}

-- ════════════════════════════════════════════════════════════════
-- ATTENDANCE
-- ════════════════════════════════════════════════════════════════

AttendanceSession {
  id             cuid PK
  schoolId       String FK → Tenant
  classId        String FK → Class
  academicYearId String FK → AcademicYear
  date           DateTime (date only)
  markedBy       String FK → User
  markedAt       DateTime
  isFinalized    Boolean default false  -- Lock after end of day
  notes          String?

  UNIQUE(classId, date)
  INDEX(schoolId, date)
}

AttendanceRecord {
  id          cuid PK
  sessionId   String FK → AttendanceSession
  studentId   String FK → Student
  status      AttendanceStatus  -- PRESENT | ABSENT | LATE | HALF_DAY | HOLIDAY | MEDICAL_LEAVE
  remark      String?           -- "Left early" | "Medical certificate submitted"
  createdAt   DateTime

  UNIQUE(sessionId, studentId)
  INDEX(studentId, sessionId)  -- For student-centric queries
}

-- ════════════════════════════════════════════════════════════════
-- FEE MANAGEMENT
-- ════════════════════════════════════════════════════════════════

FeeCategory {
  id        cuid PK
  schoolId  String FK → Tenant
  name      String    -- "Tuition Fee" | "Transport Fee" | "Activity Fee"
  code      String?   -- "TUITION", "TRANSPORT"
  isRecurring Boolean default true  -- Monthly/term vs one-time
  isTaxable Boolean default false   -- GST applicable?
  taxRate   Decimal?  -- 18% GST for some categories
  UNIQUE(schoolId, code)
}

FeeStructure {
  id             cuid PK
  schoolId       String FK → Tenant
  academicYearId String FK → AcademicYear
  gradeId        String FK → Grade
  categoryId     String FK → FeeCategory
  amount         Decimal            -- Base amount in INR
  frequency      FeeFrequency       -- MONTHLY | QUARTERLY | HALF_YEARLY | ANNUAL | ONE_TIME
  dueDay         Int?               -- Day of month when due (for monthly)
  isOptional     Boolean default false
  notes          String?
  createdAt      DateTime

  UNIQUE(academicYearId, gradeId, categoryId)
  INDEX(schoolId, academicYearId)
}

StudentFeeAccount {
  id             cuid PK
  schoolId       String FK → Tenant
  studentId      String FK → Student
  academicYearId String FK → AcademicYear
  totalAmount    Decimal     -- Computed at year start
  totalPaid      Decimal default 0
  totalDue       Decimal     -- Computed: totalAmount - totalPaid
  concession     Decimal default 0    -- Scholarship / discount
  concessionNote String?
  lastUpdatedAt  DateTime

  UNIQUE(studentId, academicYearId)
  INDEX(schoolId, academicYearId)
}

FeeInstallment {
  id             cuid PK
  schoolId       String FK → Tenant
  studentId      String FK → Student
  academicYearId String FK → AcademicYear
  categoryId     String FK → FeeCategory
  amount         Decimal
  dueDate        DateTime
  status         InstallmentStatus  -- PENDING | PAID | OVERDUE | WAIVED
  paidAt         DateTime?
  paidAmount     Decimal?           -- Actual amount paid (may differ due to concessions)
  createdAt      DateTime

  INDEX(schoolId, studentId, academicYearId)
  INDEX(dueDate, status)  -- For overdue queries
}

FeeCollection {
  id              cuid PK
  schoolId        String FK → Tenant
  studentId       String FK → Student
  academicYearId  String FK → AcademicYear
  receiptNo       String UNIQUE       -- Auto-generated: "RCP-2024-00001"
  receiptDate     DateTime
  amount          Decimal
  paymentMode     PaymentMode         -- CASH | CHEQUE | NEFT | UPI | DD
  chequeNo        String?
  bankName        String?
  transactionRef  String?
  collectedBy     String FK → User    -- Accountant / Admin who collected
  installments    FeeCollectionInstallment[]  -- Which installments this pays
  notes           String?
  isVoided        Boolean default false
  voidedBy        String? FK → User
  voidedAt        DateTime?
  voidReason      String?
  createdAt       DateTime

  INDEX(schoolId, studentId)
  INDEX(schoolId, receiptDate)
  INDEX(receiptNo)
}

FeeCollectionInstallment {
  id           cuid PK
  collectionId String FK → FeeCollection
  installmentId String FK → FeeInstallment
  amountApplied Decimal

  UNIQUE(collectionId, installmentId)
}

-- ════════════════════════════════════════════════════════════════
-- REPORT CARDS
-- ════════════════════════════════════════════════════════════════

ReportCardConfig {
  id             cuid PK
  schoolId       String FK → Tenant
  academicYearId String FK → AcademicYear
  termId         String FK → Term
  gradeId        String FK → Grade
  template       ReportTemplate  -- CBSE_10_POINT | ICSE_PERCENT | CUSTOM | STATE_BOARD
  showGrade      Boolean default true
  showRank       Boolean default false
  showAttendance Boolean default true
  showRemarks    Boolean default true
  customConfig   Json?           -- Additional template fields
  isPublished    Boolean default false
  publishedAt    DateTime?
  createdAt      DateTime

  UNIQUE(schoolId, academicYearId, termId, gradeId)
}

ReportCard {
  id             cuid PK
  schoolId       String FK → Tenant
  studentId      String FK → Student
  academicYearId String FK → AcademicYear
  termId         String FK → Term
  configId       String FK → ReportCardConfig
  totalMarks     Decimal?
  maxMarks       Decimal?
  percentage     Decimal?
  grade          String?         -- "A1" | "B2" | "PASS" | "FAIL"
  rank           Int?            -- Class rank
  attendance     Json?           -- { present, total, percentage }
  remarks        String?         -- Class teacher remarks
  isGenerated    Boolean default false
  generatedAt    DateTime?
  pdfUrl         String?         -- FileAsset key
  createdAt      DateTime
  updatedAt      DateTime

  UNIQUE(studentId, termId)
  INDEX(schoolId, termId)
}

-- ════════════════════════════════════════════════════════════════
-- NOTICES & COMMUNICATION
-- ════════════════════════════════════════════════════════════════

Notice {
  id          cuid PK
  schoolId    String FK → Tenant
  title       String
  body        String          -- Rich text / markdown
  type        NoticeType      -- ACADEMIC | EXAM | FEE | EVENT | HOLIDAY | GENERAL
  priority    NoticePriority  -- LOW | NORMAL | HIGH | URGENT
  targetAudience NoticeAudience -- ALL | ADMIN_ONLY | FACULTY | PARENTS | STUDENTS | SPECIFIC_GRADE
  gradeIds    String[]        -- If SPECIFIC_GRADE
  isPublished Boolean default false
  publishedAt DateTime?
  expiresAt   DateTime?
  attachmentUrl String?       -- FileAsset key
  createdBy   String FK → User
  createdAt   DateTime
  updatedAt   DateTime

  INDEX(schoolId, isPublished, publishedAt)
  INDEX(schoolId, type)
}

NotificationLog {
  id          cuid PK
  schoolId    String FK → Tenant
  noticeId    String? FK → Notice
  channel     NotificationChannel  -- EMAIL | SMS | WHATSAPP | IN_APP
  recipientId String               -- userId or phone
  status      NotificationStatus   -- QUEUED | SENT | DELIVERED | FAILED
  sentAt      DateTime?
  error       String?
  provider    String?              -- "resend", "msg91", "gupshup"
  providerRef String?              -- External message ID for tracking
  createdAt   DateTime

  INDEX(schoolId, channel, status)
  INDEX(noticeId)
}

-- ════════════════════════════════════════════════════════════════
-- SETTINGS & CONFIGURATION
-- ════════════════════════════════════════════════════════════════

SchoolConfig {
  id       cuid PK
  schoolId String UNIQUE FK → Tenant
  -- Academic
  currentAcademicYearId String?
  gradingSystem  GradingSystem    -- TEN_POINT | PERCENTAGE | LETTER | CUSTOM
  workingDays    Int default 6    -- 5 or 6 day week
  -- Attendance
  attendanceMinPercent Decimal?   -- Minimum % for exams (e.g., 75)
  -- Fee
  lateFeeEnabled Boolean default false
  lateFeeAmount  Decimal?
  lateFeeGrace   Int?             -- Grace days after due date
  -- Notifications
  whatsappEnabled Boolean default false
  smsEnabled      Boolean default false
  emailEnabled    Boolean default true
  -- Branding
  primaryColor  String?           -- For PDF reports
  secondaryColor String?
  logoUrl       String?
  -- Regional
  academicYearStart Int default 4 -- Month: 4 = April (Indian schools)
  timezone      String default "Asia/Kolkata"
  currency      String default "INR"
  updatedAt     DateTime
}
```

---

## F. Role–Permission Matrix

### Roles (ERP-level)

| Role | Scope | Description |
|---|---|---|
| `SUPER_ADMIN` | Platform (all schools) | SaaS team — tenant management, billing, impersonation |
| `SCHOOL_ADMIN` | School-wide | School owner / operations head. Full school access |
| `PRINCIPAL` | School-wide | Academic head. Read-heavy, approve leaves, view reports |
| `ACCOUNTANT` | School-wide | Fee module only. Cannot see marks or attendance |
| `HOD` | Department | Head of Department. Already in schema |
| `CLASS_TEACHER` | Class | Attendance, marks for assigned class |
| `SUBJECT_TEACHER` | Subject(s) | Marks only for assigned subjects |
| `PARENT` | Own children | Read-only: marks, attendance, fee, notices |
| `STUDENT` | Own data | Read-only: own marks, attendance, notices (v2+) |

### Permission Matrix

```
Permission Key              SUPER  ADMIN  PRINCIPAL  ACCOUNTANT  HOD    TEACHER  PARENT  STUDENT
─────────────────────────── ─────  ─────  ─────────  ──────────  ───    ───────  ──────  ───────
School Setup
  school.view               ✅     ✅     ✅         ✅          ✅     ✅       ❌      ❌
  school.edit               ✅     ✅     ❌         ❌          ❌     ❌       ❌      ❌
  school.subscription       ✅     ✅     ❌         ❌          ❌     ❌       ❌      ❌

Academic Year
  academic_year.view        ✅     ✅     ✅         ✅          ✅     ✅       ❌      ❌
  academic_year.manage      ✅     ✅     ❌         ❌          ❌     ❌       ❌      ❌

Users
  users.view_all            ✅     ✅     ✅         ❌          ✅     ❌       ❌      ❌
  users.create              ✅     ✅     ❌         ❌          ❌     ❌       ❌      ❌
  users.edit                ✅     ✅     ❌         ❌          ❌     ❌       ❌      ❌
  users.deactivate          ✅     ✅     ❌         ❌          ❌     ❌       ❌      ❌
  users.reset_password      ✅     ✅     ❌         ❌          ❌     ❌       ❌      ❌

Students
  students.view             ✅     ✅     ✅         ✅*         ✅     ✅†     ❌      ❌
  students.create           ✅     ✅     ❌         ❌          ❌     ❌       ❌      ❌
  students.edit             ✅     ✅     ❌         ❌          ❌     ❌       ❌      ❌
  students.bulk_import      ✅     ✅     ❌         ❌          ❌     ❌       ❌      ❌
  students.transfer_out     ✅     ✅     ❌         ❌          ❌     ❌       ❌      ❌

Attendance
  attendance.mark           ✅     ✅     ❌         ❌          ❌     ✅‡     ❌      ❌
  attendance.edit           ✅     ✅     ❌         ❌          ✅     ✅‡     ❌      ❌
  attendance.view_all       ✅     ✅     ✅         ❌          ✅     ✅†     ❌      ❌
  attendance.view_own       ❌     ❌     ❌         ❌          ❌     ❌       ✅      ✅

Marks & Exams
  marks.enter               ✅     ✅     ❌         ❌          ✅     ✅†     ❌      ❌
  marks.lock_approve        ✅     ✅     ❌         ❌          ✅     ❌       ❌      ❌
  marks.view_all            ✅     ✅     ✅         ❌          ✅     ✅†     ❌      ❌
  marks.view_own            ❌     ❌     ❌         ❌          ❌     ❌       ✅      ✅
  exams.create              ✅     ✅     ❌         ❌          ✅     ❌       ❌      ❌

Report Cards
  report_cards.generate     ✅     ✅     ✅         ❌          ✅     ❌       ❌      ❌
  report_cards.publish      ✅     ✅     ✅         ❌          ❌     ❌       ❌      ❌
  report_cards.view_own     ❌     ❌     ❌         ❌          ❌     ❌       ✅      ✅

Fee Management
  fees.view_all             ✅     ✅     ✅         ✅          ❌     ❌       ❌      ❌
  fees.collect              ✅     ✅     ❌         ✅          ❌     ❌       ❌      ❌
  fees.setup                ✅     ✅     ❌         ❌          ❌     ❌       ❌      ❌
  fees.concession           ✅     ✅     ❌         ❌          ❌     ❌       ❌      ❌
  fees.void_receipt         ✅     ✅     ❌         ❌          ❌     ❌       ❌      ❌
  fees.view_own             ❌     ❌     ❌         ❌          ❌     ❌       ✅      ❌

Notices
  notices.create            ✅     ✅     ✅         ❌          ✅     ❌       ❌      ❌
  notices.view              ✅     ✅     ✅         ✅          ✅     ✅       ✅      ✅

Audit Logs
  audit_logs.view           ✅     ✅     ❌         ❌          ❌     ❌       ❌      ❌

RBAC
  rbac.manage               ✅     ✅     ❌         ❌          ❌     ❌       ❌      ❌

Super Admin Only
  tenants.view_all          ✅     ❌     ❌         ❌          ❌     ❌       ❌      ❌
  tenants.impersonate       ✅     ❌     ❌         ❌          ❌     ❌       ❌      ❌
  tenants.suspend           ✅     ❌     ❌         ❌          ❌     ❌       ❌      ❌
  billing.manage            ✅     ❌     ❌         ❌          ❌     ❌       ❌      ❌

* Accountant sees students only for fee context (name, grade, fee status)
† Teacher sees only students in their assigned classes/subjects
‡ Class teacher only (not subject teacher)
```

---

## G. MVP Roadmap

### Phase 0 — Foundation (Weeks 1–3)
*Do this before any new feature work.*

**Goal:** Make the app production-safe, migration-based, and ERP-ready structurally.

- [ ] Switch `prisma db push` → `prisma migrate` (create initial migration from current schema)
- [ ] Add `Tenant` model — replace bare `schoolId: String` with a proper FK
- [ ] Add `AcademicYear` + `Term` models
- [ ] Extend `Student` with full SIS fields (admissionNo, DOB, address, etc.)
- [ ] Extend `User` with phone, isActive, lastLoginAt
- [ ] Add `Grade`, `Section`, `Subject` models (decouple from Class string fields)
- [ ] Add `PRINCIPAL`, `ACCOUNTANT`, `PARENT` to `UserRole` enum
- [ ] Write migration that preserves all existing data
- [ ] Add `tenantDb()` helper to enforce schoolId on all queries
- [ ] Super admin portal scaffold (`/super-admin/*`, SUPER_ADMIN role only)

**What it unlocks:** Everything else depends on these foundations.

---

### Phase 1 — Student SIS & Parent Portal (Weeks 4–7)
*The most-requested feature from Indian school admins.*

- [ ] Student full profile (admission form, photo upload, parent linking)
- [ ] Parent model + ParentStudent relationship
- [ ] Bulk student import from Excel (Name, Class, Section, DOB, Parent phone)
- [ ] Student transfer/TC workflow (isActive → false, TC certificate generation)
- [ ] Parent accounts — self-registration via phone OTP or admin-generated login
- [ ] Parent portal (`/parent/*`) — view child's marks, attendance (stub), fee (stub), notices
- [ ] Class/Section restructuring — Grade + Section + Subject as separate entities

**Dependencies:** Phase 0 complete.

---

### Phase 2 — Attendance (Weeks 8–10)
*Paper registers are the #1 pain point in Indian schools.*

- [ ] `AttendanceSession` + `AttendanceRecord` models + migration
- [ ] Teacher attendance marking UI (class list with PRESENT/ABSENT toggles)
- [ ] Bulk mark present (one click for full class, then mark absentees)
- [ ] Date-wise attendance view (calendar heatmap per student)
- [ ] Attendance summary report (% per student per term)
- [ ] Admin view: school-wide attendance % by class by date
- [ ] Absent alert — notify parent (in-app notice v1, WhatsApp v2)
- [ ] Attendance cutoff warning — flag students below 75% threshold

**Dependencies:** Phase 1 (need Student + Class + AcademicYear).

---

### Phase 3 — Report Cards (Weeks 9–11, parallel with Phase 2)
*Already have marks — just need the output layer.*

- [ ] `ReportCard` + `ReportCardConfig` models
- [ ] CBSE 10-point grading scale implementation
- [ ] ICSE percentage grading implementation
- [ ] Report card PDF template (school logo, student info, marks table, grades, attendance, remarks)
- [ ] Batch PDF generation (all students in a class for a term)
- [ ] Admin publish report cards → parents can view in parent portal
- [ ] Download individual PDF from parent portal

**Dependencies:** Phase 1 (AcademicYear, Term, Grade), existing Marks module.

---

### Phase 4 — Fee Management (Weeks 11–15)
*Revenue-critical for schools. Strongest reason to pay for ERP.*

- [ ] `FeeCategory`, `FeeStructure` models + admin setup UI
- [ ] `StudentFeeAccount` — per-student, per-year ledger
- [ ] `FeeInstallment` generation (create scheduled installments for each student at year start)
- [ ] `FeeCollection` — collect payment, generate receipt
- [ ] Receipt PDF (school letterhead, receipt number, student name, amount, mode of payment)
- [ ] Fee dues report (list of students with outstanding amounts, sortable by amount/class)
- [ ] Concession management (scholarship, sibling discount)
- [ ] Fee summary dashboard (collected today, this month, total due, defaulters count)
- [ ] Parent portal: view own fee account, download receipts

**Dependencies:** Phase 1 (Student, AcademicYear), Phase 0 (Tenant for school settings).

---

### Phase 5 — Notices & Communication (Weeks 14–16)
*WhatsApp is how Indian schools communicate. Start with in-app + email.*

- [ ] `Notice` model + admin notice board UI
- [ ] Notice categories: Academic, Exam, Fee, Holiday, Event, General
- [ ] Target audience: All, Grade-specific, Faculty-only, Parents-only
- [ ] In-app notice feed in parent portal and faculty portal
- [ ] Email delivery via Resend (on notice publish to relevant users)
- [ ] `NotificationLog` for delivery tracking
- [ ] Notice attachment (PDF circular upload)

**Dependencies:** Phase 1 (User, Parent), Phase 4 for fee notices.

---

### Phase 6 — Super Admin & SaaS Infrastructure (Weeks 15–18)
*Required to run the SaaS business.*

- [ ] Super admin portal (`/super-admin/`) with separate layout + strict role guard
- [ ] Tenant onboarding wizard (create school, setup admin account, seed academic year)
- [ ] Tenant list with subscription status, user count, last activity
- [ ] Impersonation (super admin → log in as any school admin, with audit trail)
- [ ] Subscription management (trial → paid, suspend, churn)
- [ ] School usage metrics (active users, API calls, storage used)
- [ ] Billing integration scaffold (manual for v1, Razorpay for v2)

**Dependencies:** Phase 0 (Tenant model).

---

### Phase 7 — Hardening & Launch (Weeks 18–20)
*The difference between a demo and a product.*

- [ ] Switch from `prisma db push` to full migration workflow (Phase 0 already starts this)
- [ ] Database indexes review (confirm all schoolId composite indexes exist)
- [ ] Rate limiting on auth endpoints (prevent brute force)
- [ ] Input sanitization audit (XSS on notice body, PDF injection)
- [ ] Full E2E test coverage expansion (currently 41 tests — target 80+)
- [ ] Load test: 50 concurrent teachers marking attendance
- [ ] Onboard 3 pilot schools (0 cost trial) → gather feedback
- [ ] Documentation: admin user guide (PDF or web)
- [ ] Support channel setup (WhatsApp group for school admins — ironic but effective)

---

## H. Risks and Design Mistakes to Avoid

### Risk 1: The "schoolId as string" tenant key is your load-bearing wall
**Current:** `schoolId: String` on every model — correct, keep it.
**Risk:** If you ever add a table without `schoolId`, you have a data leak waiting to happen.
**Mitigation:** Add the `tenantDb()` helper (described in Section D). Every new model must have `schoolId` as a non-nullable FK. Add a lint rule or code review checklist item.

### Risk 2: Prisma db:push in production will eventually corrupt your schema
**Current:** Using `db:push` — acceptable for dev, **not for production**.
**Risk:** One accidental `db:push` on prod can drop columns. No migration history = no rollback.
**Fix:** Do this in Phase 0. Create `prisma/migrations/` directory. Never push to prod without a migration file reviewed by a human.

### Risk 3: Fee module without receipt numbering = accounting nightmare
**Risk:** Receipt numbers must be sequential, gapless, and school-specific (Indian accounting requirement).
**Fix:** Use a `ReceiptSequence { schoolId, year, lastSeq }` table with a transaction-locked `SELECT FOR UPDATE` to generate `RCP-2024-00001`. Never use cuid() for receipt numbers.

### Risk 4: Attendance and marks in the same API call
**Risk:** Slow API that does 200 DB inserts synchronously (one per student) will timeout.
**Fix:** Use `createMany()` in Prisma for bulk attendance saves. For 60 students, this is 1 DB round-trip, not 60.

### Risk 5: Building WhatsApp in v1
**Risk:** MSG91/Gupshup requires DLT registration (India regulation), template approval (2–4 weeks), and a business WhatsApp account. This will block your v1 launch.
**Fix:** Build email (Resend) in v1. Build WhatsApp in v2 after DLT registration is done in parallel. Don't promise parents WhatsApp before it's ready.

### Risk 6: PDF report cards that look amateur
**Risk:** Schools will judge your entire ERP by the quality of the report card PDF. A bad PDF = churn.
**Fix:** Invest 3 days in the PDF template. Use `@react-pdf/renderer`. Include: school logo, watermark, student photo, grade table, attendance summary, class teacher signature block, principal seal. Match the look of what the school currently prints.

### Risk 7: Multi-tenant data in the wrong hands
**Risk:** A bug in any query that drops the `schoolId` filter exposes all schools' data.
**Fix:** The `tenantDb()` helper (Section D). All new API routes use it. Add an integration test that logs in as School A and attempts to access School B data — must return 403 or empty.

### Risk 8: One academic year, forever
**Risk:** If your data model assumes one academic year (current state), migrating to multi-year history is painful and requires breaking changes.
**Fix:** `AcademicYear` + `Term` are the first things to add in Phase 0. Every marks, attendance, fee record must reference an `academicYearId`.

### Risk 9: Building a mobile app in v1
**Risk:** A React Native app doubles your testing surface and delays every feature by 40%.
**Fix:** Make the web app fully responsive (already using Tailwind — do this right). Add a home-screen-installable PWA manifest. Indian parents on Android will add it to their home screen. Build the native app in v3 only after you have 50+ schools.

### Risk 10: Ignoring the accountant persona
**Risk:** In Indian schools, the accountant is NOT the admin. They are a separate person with very different workflow needs. If your fee UI requires admin-level knowledge to operate, the accountant won't use it.
**Fix:** The accountant role must have a separate, simplified portal: collect fee → generate receipt → print. That's it. No access to marks, no access to RBAC. Design the accountant UX separately.

---

## Implementation Plan — Converting the Current App

### What carries forward unchanged
- All `prisma/schema.prisma` models (User, Role, Permission, Faculty, Class, Student, Exam, Marks, Request, AuditLog, FileAsset, RBACLog, Department)
- All RBAC infrastructure (roles, permissions, custom features, role assignments)
- Marks workflow (SUBMITTED → LOCK_PENDING → LOCKED) — this is production-quality
- All API route handlers in `/api/v1/` — keep and extend
- Auth system (HMAC cookie, session middleware) — extend to support PARENT + STUDENT roles
- shadcn/ui component library — all 30+ components in place
- E2E test suite (41 tests) — extend, never remove

### What needs migration / extension (Phase 0)
1. **`prisma db push` → `prisma migrate`** — create `prisma/migrations/` from current schema
2. **Add `Tenant` model** — `schoolId` becomes a FK, not a bare string
3. **Extend `Student`** — 15+ new fields (DOB, admissionNo, address, etc.)
4. **Extend `User`** — phone, isActive, lastLoginAt
5. **Add `UserRole` enum values** — PRINCIPAL, ACCOUNTANT, PARENT, STUDENT
6. **Add `AcademicYear`, `Term`, `Grade`, `Section`, `Subject`** — decouple Class from string fields
7. **Refactor `Class`** — add FK to Grade, Section, Subject, AcademicYear

### Estimated conversion effort

| Phase | Weeks | Key output |
|---|---|---|
| Phase 0: Foundation | 3 | Migration-safe schema, Tenant model, AcademicYear |
| Phase 1: Student SIS | 4 | Full student profiles, parent accounts, parent portal |
| Phase 2: Attendance | 3 | Daily attendance, reports, absent alerts |
| Phase 3: Report Cards | 3 | PDF generation, publish flow, parent view |
| Phase 4: Fee Management | 5 | Full fee module, receipts, dues, accountant portal |
| Phase 5: Notices | 3 | In-app + email notices, parent feed |
| Phase 6: Super Admin | 4 | Multi-tenant SaaS management, onboarding |
| Phase 7: Hardening | 3 | Load testing, pilot schools, documentation |
| **Total** | **~28 weeks** | **v1 ERP ready for paid schools** |

*Assumes 1–2 engineers. Can be cut to 18–20 weeks with 3 engineers working Phases 2–5 in parallel.*

---

*Document version: 1.0 — May 2026*
*Next review: After Phase 0 completion*
