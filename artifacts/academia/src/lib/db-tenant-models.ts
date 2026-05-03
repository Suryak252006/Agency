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

  // Academic structure (M03 — Sprint 2)
  'AcademicYear',
  'Term',
  'Grade',
  'Section',
  'Subject',

  // Parent management (M04)
  'Parent',

  // Attendance (M04)
  'AttendanceSession',

  // Report cards (M04)
  'ReportCardConfig',
  'ReportCard',

  // Fee management (M04)
  'FeeCategory',
  'FeeStructure',
  'StudentFeeAccount',
  'FeeInstallment',
  'FeeCollection',
  'ReceiptSequence',

  // Notices (M04)
  'Notice',
  'NotificationLog',

  // Background jobs (M04)
  'JobQueue',
]);

/**
 * Models intentionally excluded from TENANT_SCOPED_MODELS because they have
 * no direct schoolId column — their tenant scope is inherited through a parent FK.
 *
 * Callers that use db directly for these models MUST scope via a nested relation
 * filter (e.g. class: { schoolId: user.schoolId }) or verify ownership of the
 * parent record first.
 */
export const MODELS_WITHOUT_SCHOOL_ID = new Set([
  'Permission',                  // Global — not tenant-specific
  'RolePermission',              // Scoped through Role (has schoolId)
  'FacultyDepartment',           // Scoped through Faculty (has schoolId)
  'ClassStudent',                // Scoped through Class (has schoolId)
  'MarksHistory',                // Scoped through Marks (has schoolId)
  'ParentStudent',               // Scoped through Parent (has schoolId)
  'AttendanceRecord',            // Scoped through AttendanceSession (has schoolId)
  'FeeCollectionInstallment',    // Scoped through FeeCollection (has schoolId)
]);
