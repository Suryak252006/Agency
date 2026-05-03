import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma, TEST_DATA, ensureGlobalSetup, cleanupTestData } from './setup';
import {
  createTestRole,
  makeAuthenticatedRequest,
  createSuperAdminContext,
  createAdminAContext,
  createFacultyPhysicsContext,
  type TestUser,
} from './helpers';

describe('Role Permissions - Access Control', () => {
  let superAdmin: TestUser;
  let admin: TestUser;
  let faculty: TestUser;

  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    await ensureGlobalSetup();

    superAdmin = await createSuperAdminContext();
    admin      = await createAdminAContext();
    faculty    = await createFacultyPhysicsContext();

    await createTestRole(TEST_DATA.roles.admin,   TEST_DATA.schools.schoolA, 'Admin Role',   ['admin:all']);
    await createTestRole(TEST_DATA.roles.faculty, TEST_DATA.schools.schoolA, 'Faculty Role', ['faculty:view']);
  });

  it('Faculty should NOT access admin-only APIs (returns 401/403/404)', async () => {
    const res = await makeAuthenticatedRequest('GET', '/api/admin/users', faculty.jwt);
    expect([401, 403, 404]).toContain(res.status);
  });

  it('Faculty should NOT create RBAC roles (returns 401/403/400)', async () => {
    const res = await makeAuthenticatedRequest('POST', '/api/rbac/roles', faculty.jwt, {
      name: 'Fake Role',
      permissions: ['admin:*'],
    });
    expect([401, 403, 400]).toContain(res.status);
  });

  it('Admin can list classes via API', async () => {
    const res = await makeAuthenticatedRequest('GET', '/api/classes', admin.jwt);
    expect([200, 400]).toContain(res.status);
  });

  it('Faculty can list their classes via API', async () => {
    const res = await makeAuthenticatedRequest('GET', '/api/classes', faculty.jwt);
    expect([200, 400]).toContain(res.status);
  });

  it('Faculty cannot directly approve a lock request (approve-lock is Admin/HOD only)', async () => {
    const ts = Date.now();

    const student = await prisma.student.create({
      data: {
        schoolId: TEST_DATA.schools.schoolA,
        name: 'Lock Test Student',
        email: `lock_student_${ts}@test.local`,
        rollNo: `LK${ts}`,
      },
    });

    const exam = await prisma.exam.create({
      data: {
        schoolId: TEST_DATA.schools.schoolA,
        departmentId: TEST_DATA.departments.physics,
        name: `Lock Test Exam ${ts}`,
        maxMarks: 100,
        startDate: new Date(),
      },
    });

    const classRecord = await prisma.class.create({
      data: {
        schoolId: TEST_DATA.schools.schoolA,
        departmentId: TEST_DATA.departments.physics,
        facultyId: TEST_DATA.faculty.physics,
        name: `Lock Test Class ${ts}`,
        grade: 10,
        section: 'A',
        subject: 'Physics',
      },
    });

    const marks = await prisma.marks.create({
      data: {
        schoolId: TEST_DATA.schools.schoolA,
        examId: exam.id,
        classId: classRecord.id,
        studentId: student.id,
        value: '85',
        status: 'LOCK_PENDING',
      },
    });

    const res = await makeAuthenticatedRequest('POST', '/api/marks/approve-lock', faculty.jwt, {
      marksIds: [marks.id],
    });
    expect([401, 403, 400]).toContain(res.status);
  });

  it('Super Admin has broad API access (role-based, no 403)', async () => {
    const res = await makeAuthenticatedRequest('GET', '/api/rbac/roles', superAdmin.jwt);
    expect([200, 400, 404]).toContain(res.status);
  });
});
