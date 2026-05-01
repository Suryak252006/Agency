import { z } from "zod";

/**
 * Shared scalar schemas
 */
export const CuidSchema = z.string().cuid();
export const EmailSchema = z.string().email("Invalid email address");
export const UrlSchema = z.string().url();

/**
 * Marks Validation
 */
export const MarksStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
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

export const SaveMarksDraftSchema = z.object({
  examId: CuidSchema,
  classId: CuidSchema,
  studentId: CuidSchema,
  value: MarkValueSchema,
});

export const SubmitMarksSchema = z.object({
  examId: CuidSchema,
  classId: CuidSchema,
  reason: z.string().optional(),
});

export const ApproveMarksSchema = z.object({
  marksIds: z.array(CuidSchema).min(1),
});

export const LockMarksSchema = z.object({
  marksIds: z.array(CuidSchema).min(1),
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
  classId: CuidSchema.optional(), // NULL = school-wide
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
 * Type Exports (for TypeScript)
 */
export type MarksStatus = z.infer<typeof MarksStatusSchema>;
export type MarkValue = z.infer<typeof MarkValueSchema>;
export type SaveMarksDraft = z.infer<typeof SaveMarksDraftSchema>;
export type SubmitMarks = z.infer<typeof SubmitMarksSchema>;
export type RequestType = z.infer<typeof RequestTypeSchema>;
export type RequestStatus = z.infer<typeof RequestStatusSchema>;
export type CreateRequest = z.infer<typeof CreateRequestSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
