/**
 * TENANT_SCOPED_MODELS — canonical list of Prisma model names that carry a
 * schoolId column and must be automatically scoped per tenant.
 *
 * CRITICAL: Prisma v6 passes PascalCase model names to $allModels query
 * extensions (e.g. 'Role', not 'role'; 'RBACLog', not 'rBACLog'). These
 * values MUST match the exact model name as written in schema.prisma.
 *
 * Rules:
 *   - Add a model here when its schema field includes `schoolId String`.
 *   - Use the exact PascalCase name from schema.prisma — NOT the camelCase
 *     accessor name used in prisma.role.findMany() etc.
 *   - Do NOT add junction/history models that have no schoolId of their own
 *     (they inherit scope through their parent FK).
 *   - Export this constant so tests can import it to verify coverage.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SPRINT 1 (current) — 16 models
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const TENANT_SCOPED_MODELS = new Set([
  // Auth / users
  'User',
  'SchoolConfig',

  // RBAC
  'Role',
  'RoleAssignment',
  'CustomFeature',
  'CustomFeatureAssignment',
  'RBACLog',

  // Structure
  'Department',
  'Faculty',
  'Class',
  'Student',
  'Exam',

  // Marks workflow
  'Marks',
  'Request',

  // Audit / files
  'AuditLog',
  'FileAsset',
]);

/**
 * Models intentionally excluded from TENANT_SCOPED_MODELS because they have
 * no direct schoolId column — their tenant scope is inherited through a parent FK.
 *
 * Callers that use db directly for these models MUST scope via a nested relation
 * filter (e.g. class: { schoolId: user.schoolId }) or verify ownership of the
 * parent record first.
 *
 * Uses PascalCase model names to match Prisma v6 $allModels extension format.
 */
export const MODELS_WITHOUT_SCHOOL_ID = new Set([
  'Permission',           // Global — not tenant-specific
  'RolePermission',       // Scoped through Role (has schoolId)
  'FacultyDepartment',    // Scoped through Faculty (has schoolId)
  'ClassStudent',         // Scoped through Class (has schoolId)
  'MarksHistory',         // Scoped through Marks (has schoolId)
]);

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SPRINT 2 — MODELS TO ADD when Milestone 1–2 schema lands
 * ─────────────────────────────────────────────────────────────────────────────
 * When you add a model with schoolId to schema.prisma, add its PascalCase name
 * to TENANT_SCOPED_MODELS above AND update the unit test in
 * tests/unit/tenant-scoped-models.test.ts to include it in EXPECTED_SPRINT_2.
 *
 * Milestone 1 (Academic Structure):
 *   'AcademicYear'       — AcademicYear.schoolId
 *   'Grade'              — Grade.schoolId
 *   'Section'            — Section.schoolId
 *   'Subject'            — Subject.schoolId
 *
 * Milestone 2 (Student SIS):
 *   'Parent'             — Parent.schoolId
 *   'AttendanceSession'  — AttendanceSession.schoolId
 *   'ReportCardConfig'   — ReportCardConfig.schoolId
 *   'ReportCard'         — ReportCard.schoolId
 *
 * Milestone 5 (Fee Management):
 *   'FeeCategory'          — FeeCategory.schoolId
 *   'FeeStructure'         — FeeStructure.schoolId
 *   'StudentFeeAccount'    — StudentFeeAccount.schoolId
 *   'FeeInstallment'       — FeeInstallment.schoolId
 *   'ReceiptSequence'      — ReceiptSequence.schoolId
 *   'FeeCollection'        — FeeCollection.schoolId
 *
 * Milestone 6 (Notices):
 *   'Notice'             — Notice.schoolId
 *   'JobQueue'           — JobQueue.schoolId
 * ─────────────────────────────────────────────────────────────────────────────
 */
