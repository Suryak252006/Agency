import { prisma, TEST_DATA } from './setup';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

/**
 * Generate JWT token for testing
 * Mimics Supabase Auth JWT structure
 */
export function generateTestJWT(userId: string, email: string): string {
  const payload = {
    sub: userId,
    email,
    aud: 'authenticated',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  // Use a test secret (in real tests, load from .env.test)
  const secret = process.env.AUTH_SECRET || 'test_secret_do_not_use_in_production';
  return jwt.sign(payload, secret, { algorithm: 'HS256' });
}

/**
 * Create a test user with role and department (deterministic by email)
 */
export async function createTestUser(
  email: string,
  name: string,
  role: UserRole,
  schoolId: string,
  departmentId?: string
) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role },
    create: {
      email,
      name,
      role,
      schoolId,
      password: 'hashed_test_password',
    },
  });

  // If faculty, create faculty profile
  if (role === UserRole.FACULTY && departmentId) {
    await prisma.faculty.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        schoolId,
      },
    });
  }

  return user;
}

/**
 * Create a test school
 */
export async function createTestSchool(schoolId: string, name: string) {
  // Assuming schools table exists in schema
  // If not, this should be skipped
  return { id: schoolId, name };
}

/**
 * Create a test department
 */
export async function createTestDepartment(
  deptId: string,
  schoolId: string,
  name: string
) {
  const department = await prisma.department.upsert({
    where: { id: deptId },
    update: {},
    create: {
      id: deptId,
      schoolId,
      name,
    },
  });

  return department;
}

/**
 * Create test roles with permissions
 */
export async function createTestRole(
  roleId: string,
  schoolId: string,
  name: string,
  permissions: string[]
) {
  const systemUser = await prisma.user.upsert({
    where: { email: 'rbac-test-system-role@local.test' },
    update: {},
    create: {
      email: 'rbac-test-system-role@local.test',
      name: 'RBAC Test System Role',
      role: UserRole.ADMIN,
      schoolId,
      password: 'hashed_test_password',
    },
  });

  const role = await prisma.role.upsert({
    where: { id: roleId },
    update: {},
    create: {
      id: roleId,
      schoolId,
      name,
      createdBy: systemUser.id,
    },
  });

  return role;
}

/**
 * Assign role to user
 */
export async function assignRoleToUser(
  userId: string,
  roleId: string,
  schoolId: string,
  departmentId?: string
) {
  const systemUser = await prisma.user.upsert({
    where: { email: 'rbac-test-system-assignment@local.test' },
    update: {},
    create: {
      email: 'rbac-test-system-assignment@local.test',
      name: 'RBAC Test System Assignment',
      role: UserRole.ADMIN,
      schoolId,
      password: 'hashed_test_password',
    },
  });

  let assignment;

  if (departmentId) {
    assignment = await prisma.roleAssignment.upsert({
      where: {
        userId_roleId_schoolId_departmentId: {
          userId,
          roleId,
          schoolId,
          departmentId,
        },
      },
      update: {},
      create: {
        userId,
        roleId,
        schoolId,
        departmentId,
        assignedBy: systemUser.id,
      },
    });
  } else {
    const existing = await prisma.roleAssignment.findFirst({
      where: {
        userId,
        roleId,
        schoolId,
        departmentId: null,
      },
    });

    assignment =
      existing ||
      (await prisma.roleAssignment.create({
        data: {
          userId,
          roleId,
          schoolId,
          departmentId: null,
          assignedBy: systemUser.id,
        },
      }));
  }

  return assignment;
}

/**
 * Make API call with auth context
 */
export async function makeAuthenticatedRequest(
  method: string,
  path: string,
  jwt: string,
  body?: any
): Promise<{ status: number; data: any; error?: any }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = `${baseUrl}${path}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));

    return {
      status: response.status,
      data,
      error: response.status >= 400 ? data : undefined,
    };
  } catch (error) {
    return {
      status: 0,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test user context helper
 */
export interface TestUserContext {
  id: string;
  email: string;
  jwt: string;
  role: UserRole;
  schoolId: string;
  departmentId?: string;
}

/**
 * Create a complete test user with JWT (deterministic by email)
 */
export async function createUserContext(
  first: string,
  second: string,
  third: UserRole | string,
  fourth: UserRole | string,
  fifth?: string,
  sixth?: string
): Promise<TestUserContext> {
  let email: string;
  let name: string;
  let role: UserRole;
  let schoolId: string;
  let departmentId: string | undefined;

  if ((fourth === UserRole.ADMIN || fourth === UserRole.FACULTY) && typeof third === 'string') {
    email = second;
    name = third;
    role = fourth;
    schoolId = fifth || '';
    departmentId = sixth;
  } else {
    email = first;
    name = second;
    role = third as UserRole;
    schoolId = fourth as string;
    departmentId = fifth;
  }

  const user = await createTestUser(email, name, role, schoolId, departmentId);
  const token = generateTestJWT(user.id, email);

  return {
    id: user.id,
    email,
    jwt: token,
    role,
    schoolId,
    departmentId,
  };
}
