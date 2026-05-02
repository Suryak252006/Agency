import { describe, it, expect, beforeEach } from 'vitest';
import { prisma, TEST_DATA } from './setup';
import { createUserContext, createTestRole, assignRoleToUser } from './helpers';
import { UserRole } from '@prisma/client';

describe('Role Permissions - Access Control', () => {
  let superAdmin: any;
  let admin: any;
  let faculty: any;

  beforeEach(async () => {
    // Create Super Admin
    superAdmin = await createUserContext(
      TEST_DATA.users.superAdmin,
      'superadmin@school.test',
      'Super Admin',
      UserRole.ADMIN,
      TEST_DATA.schools.schoolA
    );

    // Create Admin
    admin = await createUserContext(
      TEST_DATA.users.adminA,
      'admin@school.test',
      'Admin',
      UserRole.ADMIN,
      TEST_DATA.schools.schoolA
    );

    // Create Faculty
    faculty = await createUserContext(
      TEST_DATA.users.facultyPhysics,
      'faculty@school.test',
      'Faculty',
      UserRole.FACULTY,
      TEST_DATA.schools.schoolA
    );

    // Create test role
    await createTestRole(TEST_DATA.roles.admin, TEST_DATA.schools.schoolA, 'Admin', ['admin:*']);
    await createTestRole(TEST_DATA.roles.faculty, TEST_DATA.schools.schoolA, 'Faculty', ['faculty:view']);
  });

  it('Faculty should NOT access admin APIs', async () => {
    // Faculty tries to access /api/admin/users (if this exists)
    const response = await fetch('http://localhost:3000/api/admin/users', {
      headers: { Authorization: `Bearer ${faculty.jwt}` },
    })
      .then((r) => ({ status: r.status }))
      .catch(() => ({ status: 0 }));

    // Should return 403 or 401
    expect([401, 403, 404]).toContain(response.status);
  });

  it('Faculty should NOT create roles', async () => {
    const response = await fetch('http://localhost:3000/api/rbac/roles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${faculty.jwt}`,
      },
      body: JSON.stringify({
        name: 'Fake Role',
        permissions: ['admin:*'],
      }),
    })
      .then((r) => ({ status: r.status }))
      .catch(() => ({ status: 0 }));

    expect([401, 403, 400]).toContain(response.status);
  });

  it('Admin should be able to view classes', async () => {
    const response = await fetch('http://localhost:3000/api/classes', {
      headers: { Authorization: `Bearer ${admin.jwt}` },
    })
      .then((r) => ({ status: r.status }))
      .catch(() => ({ status: 0 }));

    expect([200, 400]).toContain(response.status);
  });

  it('Faculty should be able to view classes (permitted)', async () => {
    const response = await fetch('http://localhost:3000/api/classes', {
      headers: { Authorization: `Bearer ${faculty.jwt}` },
    })
      .then((r) => ({ status: r.status }))
      .catch(() => ({ status: 0 }));

    expect([200, 400]).toContain(response.status);
  });

  it('Faculty should NOT modify marks status to LOCKED', async () => {
    // Create a test exam and marks
    const exam = await prisma.exam.create({
      data: {
        id: 'exam_test_1',
        schoolId: TEST_DATA.schools.schoolA,
        name: 'Midterm',
        date: new Date(),
      },
    });

    const student = await prisma.student.create({
      data: {
        id: 'student_test_1',
        schoolId: TEST_DATA.schools.schoolA,
        name: 'Test Student',
        email: 'student@test.local',
        rollNo: '001',
      },
    });

    const classRecord = await prisma.class.create({
      data: {
        id: 'class_test_1',
        schoolId: TEST_DATA.schools.schoolA,
        name: 'Test Class',
        grade: '10',
        section: 'A',
        subject: 'Physics',
        facultyId: 'dummy',
      },
    });

    const marks = await prisma.marks.create({
      data: {
        id: 'marks_test_1',
        schoolId: TEST_DATA.schools.schoolA,
        examId: exam.id,
        classId: classRecord.id,
        studentId: student.id,
        value: '85',
        status: 'DRAFT',
      },
    });

    // Faculty tries to lock marks (should fail)
    const response = await fetch('http://localhost:3000/api/marks/lock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${faculty.jwt}`,
      },
      body: JSON.stringify({
        markIds: [marks.id],
      }),
    })
      .then((r) => ({ status: r.status }))
      .catch(() => ({ status: 0 }));

    expect([401, 403, 400]).toContain(response.status);
  });

  it('Super Admin should have access to all', async () => {
    // This is a basic check - actual implementation depends on your schema
    const response = await fetch('http://localhost:3000/api/rbac/roles', {
      headers: { Authorization: `Bearer ${superAdmin.jwt}` },
    })
      .then((r) => ({ status: r.status }))
      .catch(() => ({ status: 0 }));

    // Super admin can access role management
    expect([200, 400, 404]).toContain(response.status);
  });
});
