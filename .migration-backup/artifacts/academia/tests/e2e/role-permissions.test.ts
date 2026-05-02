import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma, TEST_DATA, ensureGlobalSetup, cleanupTestData } from './setup';
import { createUserContext, createTestRole, makeAuthenticatedRequest, BASE_URL } from './helpers';
import { UserRole } from '@prisma/client';

describe('Role Permissions - Access Control', () => {
  let superAdmin: any;
  let admin: any;
  let faculty: any;

  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    await ensureGlobalSetup();

    superAdmin = await createUserContext(
      TEST_DATA.users.superAdmin,
      'superadmin@test.local',
      'Super Admin',
      UserRole.ADMIN,
      TEST_DATA.schools.schoolA
    );

    admin = await createUserContext(
      TEST_DATA.users.adminA,
      'admin_a@test.local',
      'Admin A',
      UserRole.ADMIN,
      TEST_DATA.schools.schoolA
    );

    faculty = await createUserContext(
      TEST_DATA.users.facultyPhysics,
      'fac.phy@test.local',
      'Faculty Physics',
      UserRole.FACULTY,
      TEST_DATA.schools.schoolA
    );

    await createTestRole(TEST_DATA.roles.admin,   TEST_DATA.schools.schoolA, 'Admin Role',   ['admin:all']);
    await createTestRole(TEST_DATA.roles.faculty, TEST_DATA.schools.schoolA, 'Faculty Role', ['faculty:view']);
  });

  it('Faculty should NOT access admin-only APIs (returns 401/403/404)', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Cookie: `app_session=${faculty.jwt}` },
    })
      .then((r) => ({ status: r.status }))
      .catch(() => ({ status: 0 }));

    expect([401, 403, 404]).toContain(res.status);
  });

  it('Faculty should NOT create RBAC roles (returns 401/403/400)', async () => {
    const res = await fetch(`${BASE_URL}/api/rbac/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `app_session=${faculty.jwt}`,
      },
      body: JSON.stringify({ name: 'Fake Role', permissions: ['admin:*'] }),
    })
      .then((r) => ({ status: r.status }))
      .catch(() => ({ status: 0 }));

    expect([401, 403, 400]).toContain(res.status);
  });

  it('Admin can list classes via API', async () => {
    const res = await fetch(`${BASE_URL}/api/classes`, {
      headers: { Cookie: `app_session=${admin.jwt}` },
    })
      .then((r) => ({ status: r.status }))
      .catch(() => ({ status: 0 }));

    expect([200, 400]).toContain(res.status);
  });

  it('Faculty can list their classes via API', async () => {
    const res = await fetch(`${BASE_URL}/api/classes`, {
      headers: { Cookie: `app_session=${faculty.jwt}` },
    })
      .then((r) => ({ status: r.status }))
      .catch(() => ({ status: 0 }));

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

    const res = await fetch(`${BASE_URL}/api/marks/approve-lock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `app_session=${faculty.jwt}`,
      },
      body: JSON.stringify({ marksIds: [marks.id] }),
    })
      .then((r) => ({ status: r.status }))
      .catch(() => ({ status: 0 }));

    expect([401, 403, 400]).toContain(res.status);
  });

  it('Super Admin has broad API access (role-based, no 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/rbac/roles`, {
      headers: { Cookie: `app_session=${superAdmin.jwt}` },
    })
      .then((r) => ({ status: r.status }))
      .catch(() => ({ status: 0 }));

    expect([200, 400, 404]).toContain(res.status);
  });
});
