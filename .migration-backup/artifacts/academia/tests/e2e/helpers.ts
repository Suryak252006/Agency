import { UserRole } from '@prisma/client';
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
