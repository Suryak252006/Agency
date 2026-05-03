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
  examId: CuidSchema.optional(),
  classId: CuidSchema.optional(),
  status: MarksStatusSchema.optional(),
  ...PaginationSchema.shape,
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
 * Academic Structure — Sprint 2 (M03)
 */
export const ExamTypeSchema = z.enum([
  'FORMATIVE',
  'SUMMATIVE',
  'QUARTERLY',
  'HALF_YEARLY',
  'ANNUAL',
]);

export const SubjectTypeSchema = z.enum([
  'MAIN',
  'OPTIONAL',
  'CO_CURRICULAR',
  'LANGUAGE',
]);

export const CreateAcademicYearSchema = z.object({
  name: z.string().min(1).max(20).regex(/^\d{4}-\d{2,4}$/, 'Name must be in format "2024-25"'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
}).refine((d) => new Date(d.startDate) < new Date(d.endDate), {
  message: 'startDate must be before endDate',
  path: ['endDate'],
});

export const UpdateAcademicYearSchema = z.object({
  name: z.string().min(1).max(20).regex(/^\d{4}-\d{2,4}$/, 'Name must be in format "2024-25"').optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const CreateTermSchema = z.object({
  name: z.string().min(1).max(50),
  examType: ExamTypeSchema,
  order: z.number().int().min(1).max(10),
  weightage: z.number().int().min(1).max(100),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const UpdateTermSchema = CreateTermSchema.partial();

export const CreateGradeSchema = z.object({
  name: z.string().min(1).max(50),
  level: z.number().int().min(0).max(12),
  order: z.number().int().min(0).default(0),
});

export const UpdateGradeSchema = CreateGradeSchema.partial();

export const CreateSectionSchema = z.object({
  name: z.string().min(1).max(50),
});

export const UpdateSectionSchema = CreateSectionSchema.partial();

export const CreateSubjectSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  subjectType: SubjectTypeSchema.default('MAIN'),
  departmentId: CuidSchema.optional(),
});

export const UpdateSubjectSchema = CreateSubjectSchema.partial();

export const UpdateSchoolSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  board: z.enum(['CBSE', 'ICSE', 'STATE_BOARD', 'OTHER']).optional(),
  medium: z.string().max(50).optional(),
  logoKey: z.string().optional(),
});

export const UpdateSchoolConfigSchema = z.object({
  gradingSystem: z.enum(['TEN_POINT', 'PERCENTAGE', 'LETTER']).optional(),
  workingDays: z.number().int().min(1).max(7).optional(),
  timezone: z.string().optional(),
  academicYearStartMonth: z.number().int().min(1).max(12).optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
});

export type ExamType = z.infer<typeof ExamTypeSchema>;
export type SubjectType = z.infer<typeof SubjectTypeSchema>;
export type CreateAcademicYear = z.infer<typeof CreateAcademicYearSchema>;
export type UpdateAcademicYear = z.infer<typeof UpdateAcademicYearSchema>;
export type CreateTerm = z.infer<typeof CreateTermSchema>;
export type UpdateTerm = z.infer<typeof UpdateTermSchema>;
export type CreateGrade = z.infer<typeof CreateGradeSchema>;
export type UpdateGrade = z.infer<typeof UpdateGradeSchema>;
export type CreateSection = z.infer<typeof CreateSectionSchema>;
export type UpdateSection = z.infer<typeof UpdateSectionSchema>;
export type CreateSubject = z.infer<typeof CreateSubjectSchema>;
export type UpdateSubject = z.infer<typeof UpdateSubjectSchema>;
export type UpdateSchool = z.infer<typeof UpdateSchoolSchema>;
export type UpdateSchoolConfig = z.infer<typeof UpdateSchoolConfigSchema>;

/** API response record shapes (server-managed fields not present in create/update schemas) */
export type TermRecord = {
  id: string;
  name: string;
  examType: ExamType;
  order: number;
  weightage: number;
  isPublished: boolean;
};

export type AcademicYearRecord = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isLocked: boolean;
  terms: TermRecord[];
};

export type GradeRecord = {
  id: string;
  name: string;
  level: number;
  order: number;
};

export type SectionRecord = {
  id: string;
  name: string;
};

export type SubjectRecord = {
  id: string;
  name: string;
  code: string;
  subjectType: SubjectType;
  departmentId: string | null;
};

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

/**
 * M04 — SIS, Attendance, Fees, Notices
 */
export const GenderSchema = z.enum(['MALE', 'FEMALE', 'OTHER']);
export const StudentCategorySchema = z.enum(['GENERAL', 'OBC', 'SC', 'ST', 'EWS', 'OTHER']);
export const ParentRelationSchema = z.enum(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER']);
export const AttendanceStatusSchema = z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'HOLIDAY', 'MEDICAL_LEAVE']);
export const FeeFrequencySchema = z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL']);
export const PaymentModeSchema = z.enum(['CASH', 'CHEQUE', 'NEFT', 'UPI', 'DEMAND_DRAFT']);
export const NoticeTypeSchema = z.enum(['GENERAL', 'ACADEMIC', 'EXAM', 'FEE', 'EVENT', 'HOLIDAY', 'URGENT']);
export const NoticeAudienceSchema = z.enum(['ALL', 'ADMIN_ONLY', 'FACULTY', 'PARENTS', 'STUDENTS', 'SPECIFIC_GRADES']);
export const ReportTemplateSchema = z.enum(['CBSE_10_POINT', 'ICSE_PERCENT', 'STATE_BOARD_PERCENT', 'CUSTOM']);

export const CreateParentSchema = z.object({
  fatherName: z.string().min(2).max(100).optional(),
  motherName: z.string().min(2).max(100).optional(),
  guardianName: z.string().min(2).max(100).optional(),
  primaryPhone: z.string().min(7).max(20),
  secondaryPhone: z.string().max(20).optional(),
  email: EmailSchema.optional(),
  occupation: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
});

export const UpdateParentSchema = CreateParentSchema.partial();

export const LinkStudentToParentSchema = z.object({
  studentId: CuidSchema,
  relation: ParentRelationSchema,
  isPrimary: z.boolean().default(false),
});

export const CreateAttendanceSessionSchema = z.object({
  classId: CuidSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  academicYearId: CuidSchema.optional(),
});

export const UpsertAttendanceRecordSchema = z.object({
  studentId: CuidSchema,
  status: AttendanceStatusSchema,
  note: z.string().max(300).optional(),
});

export const BulkAttendanceSchema = z.object({
  sessionId: CuidSchema,
  records: z.array(UpsertAttendanceRecordSchema).min(1),
});

export const CreateFeeCategorySchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().max(20).optional(),
  isRecurring: z.boolean().default(true),
});

export const UpdateFeeCategorySchema = CreateFeeCategorySchema.partial();

export const CreateFeeStructureSchema = z.object({
  categoryId: CuidSchema,
  gradeId: CuidSchema.optional(),
  academicYearId: CuidSchema.optional(),
  amount: z.number().positive(),
  frequency: FeeFrequencySchema,
  dueDay: z.number().int().min(1).max(31).optional(),
  isOptional: z.boolean().default(false),
});

export const UpdateFeeStructureSchema = CreateFeeStructureSchema.partial();

export const RecordFeeCollectionSchema = z.object({
  studentId: CuidSchema,
  academicYearId: CuidSchema.optional(),
  installmentIds: z.array(CuidSchema).min(1),
  amount: z.number().positive(),
  mode: PaymentModeSchema,
  transactionRef: z.string().max(100).optional(),
  note: z.string().max(300).optional(),
  paidAt: z.string().datetime().optional(),
});

export const CreateNoticeSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(10),
  type: NoticeTypeSchema.default('GENERAL'),
  audience: NoticeAudienceSchema.default('ALL'),
  priority: z.number().int().min(1).max(10).default(1),
  publishAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const UpdateNoticeSchema = CreateNoticeSchema.partial();

export const CreateReportCardConfigSchema = z.object({
  academicYearId: CuidSchema,
  termId: CuidSchema.optional(),
  gradeId: CuidSchema.optional(),
  template: ReportTemplateSchema.default('CBSE_10_POINT'),
  includeAttendance: z.boolean().default(true),
  includeRemarks: z.boolean().default(true),
});

export const UpdateReportCardConfigSchema = CreateReportCardConfigSchema.partial();

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
});

export type Gender = z.infer<typeof GenderSchema>;
export type StudentCategory = z.infer<typeof StudentCategorySchema>;
export type ParentRelation = z.infer<typeof ParentRelationSchema>;
export type AttendanceStatus = z.infer<typeof AttendanceStatusSchema>;
export type FeeFrequency = z.infer<typeof FeeFrequencySchema>;
export type PaymentMode = z.infer<typeof PaymentModeSchema>;
export type NoticeType = z.infer<typeof NoticeTypeSchema>;
export type NoticeAudience = z.infer<typeof NoticeAudienceSchema>;
export type ReportTemplate = z.infer<typeof ReportTemplateSchema>;
export type CreateParent = z.infer<typeof CreateParentSchema>;
export type UpdateParent = z.infer<typeof UpdateParentSchema>;
export type LinkStudentToParent = z.infer<typeof LinkStudentToParentSchema>;
export type CreateAttendanceSession = z.infer<typeof CreateAttendanceSessionSchema>;
export type BulkAttendance = z.infer<typeof BulkAttendanceSchema>;
export type CreateFeeCategory = z.infer<typeof CreateFeeCategorySchema>;
export type CreateFeeStructure = z.infer<typeof CreateFeeStructureSchema>;
export type RecordFeeCollection = z.infer<typeof RecordFeeCollectionSchema>;
export type CreateNotice = z.infer<typeof CreateNoticeSchema>;
export type UpdateNotice = z.infer<typeof UpdateNoticeSchema>;
export type CreateReportCardConfig = z.infer<typeof CreateReportCardConfigSchema>;
export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
