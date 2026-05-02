import { z } from "zod";

/**
 * Shared scalar schemas
 */
export const CuidSchema = z.string().cuid();
export const EmailSchema = z.string().email("Invalid email address");
export const UrlSchema = z.string().url();

/**
 * Marks Status
 *
 * Workflow: SUBMITTED → LOCK_PENDING → LOCKED  (or LOCK_PENDING → SUBMITTED on rejection)
 *
 *  SUBMITTED    — Faculty has entered/saved marks. Editable.
 *  LOCK_PENDING — Faculty has requested a lock. Awaiting Admin/HOD approval. Read-only.
 *  LOCKED       — Admin/HOD approved the lock. Final and immutable.
 *
 * Transitions:
 *  Faculty:    SUBMITTED    → LOCK_PENDING  (request lock)
 *  Admin/HOD:  LOCK_PENDING → LOCKED        (approve lock request)
 *  Admin/HOD:  LOCK_PENDING → SUBMITTED     (reject lock request)
 *  Super Admin: can override any state
 */
export const MarksStatusSchema = z.enum([
  "SUBMITTED",
  "LOCK_PENDING",
  "LOCKED",
]);

export const MarkValueSchema = z
  .string()
  .refine(
    (val) => {
      if (val === "AB" || val === "NA") return true;
      const num = parseInt(val);
      return !isNaN(num) && num >= 0 && num <= 100;
    },
    { message: "Mark must be 0-100, AB, or NA" }
  );

/** Faculty saves/updates a mark for a student */
export const SaveMarkSchema = z.object({
  examId: CuidSchema,
  classId: CuidSchema,
  studentId: CuidSchema,
  value: MarkValueSchema,
});

/** Faculty requests a lock for all SUBMITTED marks in an exam+class */
export const RequestLockSchema = z.object({
  examId: CuidSchema,
  classId: CuidSchema,
});

/** Admin/HOD approves a lock request — LOCK_PENDING → LOCKED */
export const ApproveLockSchema = z.object({
  marksIds: z.array(CuidSchema).min(1),
});

/** Admin/HOD rejects a lock request — LOCK_PENDING → SUBMITTED */
export const RejectLockSchema = z.object({
  marksIds: z.array(CuidSchema).min(1),
  reason: z.string().min(5, "Rejection reason is required").max(500),
});

/**
 * Request Validation
 */
export const RequestTypeSchema = z.enum([
  "EDIT_MARKS",
  "ACCESS_REQUEST",
  "CORRECTION_REQUEST",
]);

export const RequestStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const CreateRequestSchema = z.object({
  type: RequestTypeSchema,
  marksId: CuidSchema.optional(),
  reason: z
    .string()
    .min(10, "Reason must be at least 10 characters")
    .max(500),
});

export const ApproveRequestSchema = z.object({
  response: z.string().optional(),
});

export const RejectRequestSchema = z.object({
  response: z
    .string()
    .min(5, "Response required")
    .max(500),
});

export const UpdateRequestStatusSchema = z
  .object({
    status: RequestStatusSchema.refine((status) => status !== "PENDING", {
      message: "Only APPROVED or REJECTED are supported",
    }),
    response: z.string().min(1).max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === "REJECTED" && !value.response) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Response required when rejecting a request",
        path: ["response"],
      });
    }
  });

/**
 * User & Auth
 */
export const UserRoleSchema = z.enum(["ADMIN", "FACULTY"]);

export const SignupSchema = z.object({
  email: EmailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain uppercase letter")
    .regex(/[0-9]/, "Password must contain number"),
  name: z.string().min(2).max(100),
  role: UserRoleSchema,
  schoolId: CuidSchema,
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1),
});

export const SessionSchema = z.object({
  user: z.object({
    id: CuidSchema,
    email: EmailSchema,
    name: z.string(),
    role: UserRoleSchema,
    schoolId: CuidSchema,
  }),
  expires: z.string().datetime(),
});

/**
 * Class & Student Management
 */
export const CreateClassSchema = z.object({
  name: z.string().min(2).max(100),
  grade: z.number().int().min(1).max(12),
  section: z.string().length(1).regex(/[A-Z]/),
  subject: z.string().min(2).max(100),
  facultyId: CuidSchema,
});

export const UpdateClassSchema = CreateClassSchema.partial();

export const CreateStudentSchema = z.object({
  email: EmailSchema,
  name: z.string().min(2).max(100),
  rollNo: z.string().min(1).max(20),
});

export const EnrollStudentSchema = z.object({
  classId: CuidSchema,
  studentId: CuidSchema,
});

/**
 * Exam Management
 */
export const CreateExamSchema = z.object({
  name: z.string().min(2).max(100),
  maxMarks: z.number().int().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  classId: CuidSchema.optional(),
});

export const UpdateExamSchema = CreateExamSchema.partial();

/**
 * Communication
 */
export const SendCommunicationSchema = z.object({
  templateId: CuidSchema,
  studentIds: z.array(CuidSchema).min(1),
  variables: z.record(z.string()).optional(),
});

/**
 * Query Schemas
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const GetMarksQuerySchema = z.object({
  examId: CuidSchema,
  classId: CuidSchema.optional(),
  status: MarksStatusSchema.optional(),
});

export const GetRequestsQuerySchema = z.object({
  status: RequestStatusSchema.optional(),
  type: RequestTypeSchema.optional(),
  role: UserRoleSchema.optional(),
  ...PaginationSchema.shape,
});

export const GetLogsQuerySchema = z.object({
  action: z.string().optional(),
  entityId: CuidSchema.optional(),
  days: z.coerce.number().int().positive().default(30),
  ...PaginationSchema.shape,
});

/**
 * API Response Envelope
 */
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.any()).optional(),
  timestamp: z.string().datetime(),
  requestId: z.string(),
});

export const ApiSuccessSchema = z.object({
  data: z.any(),
  timestamp: z.string().datetime(),
  requestId: z.string(),
});

/**
 * Type Exports
 */
export type MarksStatus = z.infer<typeof MarksStatusSchema>;
export type MarkValue = z.infer<typeof MarkValueSchema>;
export type SaveMark = z.infer<typeof SaveMarkSchema>;
export type RequestLock = z.infer<typeof RequestLockSchema>;
export type ApproveLock = z.infer<typeof ApproveLockSchema>;
export type RejectLock = z.infer<typeof RejectLockSchema>;
export type RequestType = z.infer<typeof RequestTypeSchema>;
export type RequestStatus = z.infer<typeof RequestStatusSchema>;
export type CreateRequest = z.infer<typeof CreateRequestSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
