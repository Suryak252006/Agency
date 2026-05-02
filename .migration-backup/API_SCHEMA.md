# API Schema Design - School Academic Management System

## Database Schema (Prisma)

### Core Entities

```prisma
enum UserRole {
  ADMIN
  FACULTY
}

enum MarksStatus {
  DRAFT
  SUBMITTED
  APPROVED
  LOCKED
}

enum RequestStatus {
  PENDING
  APPROVED
  REJECTED
}

enum RequestType {
  EDIT_MARKS
  ACCESS_REQUEST
  CORRECTION_REQUEST
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      UserRole
  schoolId  String   // Multi-tenant support
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  faculty    Faculty?
  auditLogs  AuditLog[]
  requests   Request[]

  @@index([schoolId, role])
}

model Faculty {
  id       String @id @default(cuid())
  userId   String @unique
  schoolId String
  classes  Class[]
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([schoolId])
}

model Class {
  id        String   @id @default(cuid())
  schoolId  String
  name      String
  grade     Int
  section   String
  subject   String
  facultyId String
  createdAt DateTime @default(now())

  // Relations
  faculty  Faculty  @relation(fields: [facultyId], references: [id], onDelete: Cascade)
  students ClassStudent[]
  marks    Marks[]

  @@unique([schoolId, grade, section, subject])
  @@index([schoolId, facultyId])
}

model Student {
  id       String @id @default(cuid())
  schoolId String
  email    String
  name     String
  rollNo   String
  createdAt DateTime @default(now())

  // Relations
  classes ClassStudent[]
  marks   Marks[]

  @@unique([schoolId, email])
  @@index([schoolId])
}

model ClassStudent {
  id        String   @id @default(cuid())
  classId   String
  studentId String
  enrolledAt DateTime @default(now())

  // Relations
  class   Class   @relation(fields: [classId], references: [id], onDelete: Cascade)
  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([classId, studentId])
}

model Exam {
  id        String   @id @default(cuid())
  schoolId  String
  classId   String?  // NULL = school-wide
  name      String
  maxMarks  Int
  startDate DateTime
  endDate   DateTime?
  createdAt DateTime @default(now())

  // Relations
  marks Marks[]

  @@index([schoolId, classId])
}

model Marks {
  id         String      @id @default(cuid())
  schoolId   String
  examId     String
  classId    String
  studentId  String
  value      String      // "75" | "AB" | "NA"
  status     MarksStatus @default(DRAFT)
  submittedAt DateTime?
  approvedAt DateTime?
  lockedAt   DateTime?
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt

  // Relations
  exam   Exam   @relation(fields: [examId], references: [id], onDelete: Cascade)
  class  Class  @relation(fields: [classId], references: [id], onDelete: Cascade)
  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  history MarksHistory[]
  
  @@unique([examId, studentId])
  @@index([schoolId, examId, classId, status])
}

model MarksHistory {
  id        String   @id @default(cuid())
  marksId   String
  value     String   // Previous value
  status    MarksStatus
  changedBy String   // User ID
  reason    String?
  createdAt DateTime @default(now())

  // Relations
  marks Marks @relation(fields: [marksId], references: [id], onDelete: Cascade)

  @@index([marksId, createdAt])
}

model Request {
  id          String        @id @default(cuid())
  schoolId    String
  userId      String
  type        RequestType
  status      RequestStatus @default(PENDING)
  marksId     String?       // For edit requests
  reason      String
  response    String?       // Admin's response
  respondedBy String?       // Admin user ID
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([schoolId, status, createdAt])
}

model AuditLog {
  id        String   @id @default(cuid())
  schoolId  String
  userId    String
  action    String   // "MARKS_SUBMITTED", "REQUEST_APPROVED", etc
  entity    String   // "marks", "request", "student", etc
  entityId  String
  changes   Json?    // { before: {...}, after: {...} }
  ipAddress String?
  createdAt DateTime @default(now())

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([schoolId, action, entityId, createdAt])
}
```

---

## API Endpoints & Zod Schemas

### Authentication

```
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/session
```

---

### Marks (Core Workflow)

#### Get Marks for Exam
```
GET /api/marks?examId=EX-001&classId=10A
Response: { marks: Marks[], status: MarksStatus, canEdit: boolean }
```

#### Save Draft Mark
```
POST /api/marks/draft
Body: { examId, studentId, value }
Response: { marksId, status: DRAFT, syncedAt }
```

#### Submit Marks (State: DRAFT → SUBMITTED)
```
POST /api/marks/submit
Body: { examId, classId }
Response: { submittedCount, lockedAt, cannotEdit: true }
```

#### Admin: Approve Marks (State: SUBMITTED → APPROVED)
```
POST /api/marks/approve
Body: { marksIds: string[] }
Response: { approvedCount, now: APPROVED }
```

#### Admin: Lock Marks (State: APPROVED → LOCKED)
```
POST /api/marks/lock
Body: { marksIds: string[] }
Response: { lockedCount }
```

#### Get Marks History (Audit Trail)
```
GET /api/marks/:marksId/history
Response: { history: MarksHistory[] }
```

---

### Requests (Edit/Access)

#### Create Request
```
POST /api/requests
Body: { 
  type: "EDIT_MARKS" | "ACCESS_REQUEST" | "CORRECTION_REQUEST",
  marksId?: string,
  reason: string 
}
Response: { requestId, status: PENDING, createdAt }
```

#### Get Requests (Faculty)
```
GET /api/requests?role=faculty
Response: { requests: Request[], pending: number }
```

#### Get Requests (Admin)
```
GET /api/requests?role=admin&status=PENDING
Response: { requests: Request[], totalPending: number }
```

#### Approve Request
```
POST /api/requests/:id/approve
Body: { response?: string }
Response: { status: APPROVED, respondedAt }
```

#### Reject Request
```
POST /api/requests/:id/reject
Body: { response: string }
Response: { status: REJECTED, respondedAt }
```

---

### Classes & Students

#### List Classes (Faculty)
```
GET /api/classes?role=faculty
Response: { classes: Class[], totalStudents: number }
```

#### Get Class Details
```
GET /api/classes/:id
Response: { class: Class, students: Student[], exams: Exam[] }
```

#### List Students (Admin)
```
GET /api/students?page=0&limit=20
Response: { students: Student[], total: number }
```

---

### Communication

#### Send Bulk Communication
```
POST /api/communication/send
Body: { 
  template: string,
  studentIds: string[],
  variables: Record<string, string> 
}
Response: { sent: number, failed: number }
```

---

### Logs & Audit

#### Get Audit Logs (Admin)
```
GET /api/logs?action=MARKS_SUBMITTED&days=30
Response: { logs: AuditLog[], total: number }
```

---

## Error Contract

All errors follow this shape:

```typescript
type ApiError = {
  code: string;           // "MARKS_LOCKED" | "INVALID_MARKS" | "UNAUTHORIZED"
  message: string;        // User-friendly message
  details?: Record<string, any>; // Field errors, etc
  timestamp: string;      // ISO 8601
  requestId: string;      // For support debugging
}

HTTP Status Codes:
- 200: Success
- 400: Validation error (code: "VALIDATION_ERROR")
- 401: Unauthorized (code: "UNAUTHORIZED")
- 403: Forbidden (code: "FORBIDDEN")
- 404: Not found (code: "NOT_FOUND")
- 409: Conflict (code: "CONFLICT" - e.g., marks already locked)
- 429: Rate limited (code: "RATE_LIMITED")
- 500: Server error (code: "INTERNAL_ERROR")
```

---

## State Machines

### Marks Lifecycle
```
DRAFT
  ↓ [Submit]
SUBMITTED (locked from faculty edits)
  ↓ [Approve]
APPROVED
  ↓ [Lock]
LOCKED (permanent)

Faculty edit request workflow:
LOCKED → Request submitted → Admin approves → UPDATED → Submit → SUBMITTED → ...
```

### Request Lifecycle
```
PENDING
  ├→ [Approve] → APPROVED
  └→ [Reject] → REJECTED
```

---

## Validation Schemas (Zod)

See `src/schemas/` directory for full Zod definitions.

Key validations:
- Marks: 0 ≤ value ≤ maxMarks OR "AB" OR "NA"
- Email: valid format, unique per school
- Transitions: only allowed state changes
- Concurrency: last-write-wins with audit trail
