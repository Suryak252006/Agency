import { UserRole, type AcademicYear } from '@prisma/client';
import { createAppSessionCookie, type AppSessionRole } from '@/lib/auth/session-cookie';
import { prisma, TEST_DATA, TEST_PASSWORD_HASH } from './setup';

export interface TestUser {
  id: string;
  jwt: string;   // Signed app_session cookie value — pass as Cookie header
  email: string;
  facultyId?: string;
}

const PORT = process.env.PORT ?? '18373';
export const BASE_URL = process.env.TEST_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * Maps a Prisma UserRole to the AppSessionRole stored in the HMAC cookie.
 * Mirrors the logic in src/app/api/auth/login/route.ts → dbRoleToSessionRole.
 */
function dbRoleToAppRole(role: UserRole): AppSessionRole {
  switch (role) {
    case UserRole.ADMIN:
    case UserRole.PRINCIPAL:
    case UserRole.ACCOUNTANT:
      return 'admin';
    case UserRole.FACULTY:
      return 'faculty';
    case UserRole.PARENT:
      return 'parent';
    default:
      return 'faculty';
  }
}

/**
 * Creates (or upserts) a User in the DB, mints a signed session cookie,
 * and returns a TestUser ready for making authenticated API requests.
 *
 * For FACULTY role, also creates/upserts a Faculty record.
 * Pass departmentId to link the faculty to a department.
 *
 * For PARENT role, no Faculty record is created. The cookie role is 'parent'.
 */
export async function createUserContext(
  userId: string,
  email: string,
  name: string,
  role: UserRole,
  schoolId: string,
  departmentId?: string
): Promise<TestUser> {
  await prisma.user.upsert({
    where: { id: userId },
    update: { email, name, role, schoolId },
    create: { id: userId, email, name, role, schoolId, password: TEST_PASSWORD_HASH },
  });

  let facultyId: string | undefined;

  if (role === UserRole.FACULTY) {
    const fac = await prisma.faculty.upsert({
      where: { userId },
      create: { userId, schoolId },
      update: {},
    });
    facultyId = fac.id;

    if (departmentId) {
      await prisma.facultyDepartment.upsert({
        where: { facultyId_departmentId: { facultyId: fac.id, departmentId } },
        create: { facultyId: fac.id, departmentId, primary: true },
        update: {},
      });
    }
  }

  const appRole = dbRoleToAppRole(role);
  const cookieValue = await createAppSessionCookie({
    userId,
    email,
    role: appRole,
    schoolId,
    name,
    facultyId: facultyId ?? null,
  });

  return { id: userId, jwt: cookieValue, email, facultyId };
}

/**
 * Makes an HTTP request to the running app server with a session cookie.
 * Uses the same cookie-based auth the app uses internally.
 */
export async function makeAuthenticatedRequest(
  method: string,
  path: string,
  cookieValue: string,
  body?: unknown
): Promise<{ status: number; data: any }> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Cookie': `app_session=${cookieValue}`,
      'Content-Type': 'application/json',
    },
    body: body != null ? JSON.stringify(body) : undefined,
  }).catch(() => null);

  if (!res) return { status: 0, data: {} };
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

/**
 * Creates or retrieves a test Department.
 */
export async function createTestDepartment(
  id: string,
  schoolId: string,
  name: string,
  headId?: string
) {
  return prisma.department.upsert({
    where: { id },
    create: { id, schoolId, name, headId },
    update: headId ? { headId } : {},
  });
}

/**
 * Creates a test Role and associated Permission/RolePermission records.
 * permissionKeys: e.g. ['marks.view', 'marks.approve']
 * key format: '<module>.<action>'
 */
export async function createTestRole(
  id: string,
  schoolId: string,
  name: string,
  permissionKeys: string[]
) {
  const role = await prisma.role.upsert({
    where: { id },
    create: { id, schoolId, name, createdBy: TEST_DATA.users.adminA },
    update: {},
  });

  for (const key of permissionKeys) {
    const [module, action] = key.split('.');
    const perm = await prisma.permission.upsert({
      where: { key },
      create: { key, module: module ?? key, action: action ?? 'any' },
      update: {},
    });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
      create: { roleId: role.id, permissionId: perm.id },
      update: {},
    });
  }

  return role;
}

/**
 * Assigns a Role to a User.
 */
export async function assignRoleToUser(
  userId: string,
  roleId: string,
  schoolId: string,
  assignedBy: string
) {
  return prisma.roleAssignment.upsert({
    where: { userId_roleId_schoolId_departmentId: { userId, roleId, schoolId, departmentId: null as any } },
    create: { userId, roleId, schoolId, assignedBy },
    update: {},
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-built user context factories for the known global test users.
// Eliminates the repeated 5-arg createUserContext(...) calls across test files.
// ─────────────────────────────────────────────────────────────────────────────

export function createSuperAdminContext(): Promise<TestUser> {
  return createUserContext(
    TEST_DATA.users.superAdmin,
    'superadmin@test.local',
    'Super Admin',
    UserRole.ADMIN,
    TEST_DATA.schools.schoolA,
  );
}

export function createAdminAContext(): Promise<TestUser> {
  return createUserContext(
    TEST_DATA.users.adminA,
    'admin_a@test.local',
    'Admin A',
    UserRole.ADMIN,
    TEST_DATA.schools.schoolA,
  );
}

export function createAdminBContext(): Promise<TestUser> {
  return createUserContext(
    TEST_DATA.users.adminB,
    'admin_b@test.local',
    'Admin B',
    UserRole.ADMIN,
    TEST_DATA.schools.schoolB,
  );
}

/** departmentId is optional — omit for a general faculty context, pass for dept-scoped tests */
export function createFacultyPhysicsContext(departmentId?: string): Promise<TestUser> {
  return createUserContext(
    TEST_DATA.users.facultyPhysics,
    'fac.phy@test.local',
    'Faculty Physics',
    UserRole.FACULTY,
    TEST_DATA.schools.schoolA,
    departmentId,
  );
}

export function createFacultyMathContext(departmentId?: string): Promise<TestUser> {
  return createUserContext(
    TEST_DATA.users.facultyMath,
    'fac.math@test.local',
    'Faculty Math',
    UserRole.FACULTY,
    TEST_DATA.schools.schoolA,
    departmentId,
  );
}

export function createHodPhysicsContext(): Promise<TestUser> {
  return createUserContext(
    TEST_DATA.users.hodPhysics,
    'hod.phy@test.local',
    'HOD Physics',
    UserRole.ADMIN,
    TEST_DATA.schools.schoolA,
    TEST_DATA.departments.physics,
  );
}

export function createHodMathContext(): Promise<TestUser> {
  return createUserContext(
    TEST_DATA.users.hodMath,
    'hod.math@test.local',
    'HOD Math',
    UserRole.ADMIN,
    TEST_DATA.schools.schoolA,
    TEST_DATA.departments.mathematics,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// School B secondary faculty — canonical fixture shared by tenant-isolation
// and rls-validation tests. Uses TEST_DATA.users.facultyB / TEST_DATA.faculty.b
// so cleanup via cleanupTestData() (schoolId filter) handles it automatically.
// ─────────────────────────────────────────────────────────────────────────────

export async function ensureSchoolBFaculty(): Promise<void> {
  const userId    = TEST_DATA.users.facultyB;
  const facultyId = TEST_DATA.faculty.b;

  await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email: 'fac_b@test.local',
      name: 'Faculty B',
      role: UserRole.FACULTY,
      schoolId: TEST_DATA.schools.schoolB,
      password: TEST_PASSWORD_HASH,
    },
    update: {},
  });

  await prisma.faculty.deleteMany({ where: { id: facultyId, NOT: { userId } } });
  await prisma.faculty.deleteMany({ where: { userId, NOT: { id: facultyId } } });

  await prisma.faculty.upsert({
    where: { userId },
    create: { id: facultyId, userId, schoolId: TEST_DATA.schools.schoolB },
    update: {},
  });
}

/**
 * Returns the Faculty.id for the canonical School B secondary faculty.
 * Synchronous — the ID is a constant in TEST_DATA; no DB query needed.
 * Call ensureSchoolBFaculty() first to guarantee the record exists.
 */
export function getSchoolBFacultyId(): string {
  return TEST_DATA.faculty.b;
}

// ─────────────────────────────────────────────────────────────────────────────
// Academic year factory — eliminates 9+ identical prisma.academicYear.create
// calls in academic-structure.test.ts. Defaults to a standard unlocked 2024-25.
// ─────────────────────────────────────────────────────────────────────────────

export async function createTestAcademicYear(
  schoolId: string,
  overrides?: {
    name?: string;
    startDate?: Date;
    endDate?: Date;
    isCurrent?: boolean;
    isLocked?: boolean;
  }
): Promise<AcademicYear> {
  return prisma.academicYear.create({
    data: {
      schoolId,
      name:      overrides?.name      ?? '2024-25',
      startDate: overrides?.startDate ?? new Date('2024-04-01'),
      endDate:   overrides?.endDate   ?? new Date('2025-03-31'),
      isCurrent: overrides?.isCurrent ?? false,
      isLocked:  overrides?.isLocked  ?? false,
    },
  });
}
