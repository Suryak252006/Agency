import { describe, it, expect, beforeEach } from 'vitest';
import { prisma, TEST_DATA } from './setup';
import {
  createUserContext,
  createTestDepartment,
  makeAuthenticatedRequest,
} from './helpers';
import { UserRole } from '@prisma/client';

describe('Tenant Isolation - School A & B separation', () => {
  let adminA: any;
  let adminB: any;
  let classInSchoolA: any;
  let classInSchoolB: any;

  beforeEach(async () => {
    // Ensure admin users exist (deterministic by email)
    const adminAEmail = `${TEST_DATA.users.adminA}@local.test`;
    const adminBEmail = `${TEST_DATA.users.adminB}@local.test`;

    await prisma.user.upsert({
      where: { email: adminAEmail },
      update: {},
      create: {
        email: adminAEmail,
        name: 'Admin A',
        role: UserRole.ADMIN,
        schoolId: TEST_DATA.schools.schoolA,
        password: 'hashed',
      },
    });

    await prisma.user.upsert({
      where: { email: adminBEmail },
      update: {},
      create: {
        email: adminBEmail,
        name: 'Admin B',
        role: UserRole.ADMIN,
        schoolId: TEST_DATA.schools.schoolB,
        password: 'hashed',
      },
    });

    // Ensure we have a real faculty to reference for classes
    const facultyA = await prisma.faculty.findFirst({ where: { schoolId: TEST_DATA.schools.schoolA } });
    const facultyB = await prisma.faculty.findFirst({ where: { schoolId: TEST_DATA.schools.schoolB } });

    // Create class in School A
    classInSchoolA = await prisma.class.upsert({
      where: { id: 'class_school_a' },
      update: {},
      create: {
        id: 'class_school_a',
        schoolId: TEST_DATA.schools.schoolA,
        departmentId: TEST_DATA.departments.physics,
        name: 'Class 10A',
        grade: 10,
        section: 'A',
        subject: 'Physics',
        facultyId: facultyA!.id,
      },
    });

    // Create class in School B
    classInSchoolB = await prisma.class.upsert({
      where: { id: 'class_school_b' },
      update: {},
      create: {
        id: 'class_school_b',
        schoolId: TEST_DATA.schools.schoolB,
        departmentId: TEST_DATA.departments.chemistry,
        name: 'Class 10B',
        grade: 10,
        section: 'B',
        subject: 'Chemistry',
        facultyId: facultyB!.id,
      },
    });

    adminA = await createUserContext(
      adminAEmail,
      'Admin A',
      UserRole.ADMIN,
      TEST_DATA.schools.schoolA
    );

    adminB = await createUserContext(
      adminBEmail,
      'Admin B',
      UserRole.ADMIN,
      TEST_DATA.schools.schoolB
    );
  });

  it('Admin A should NOT access School B classes via API', async () => {
    // Admin A tries to access School B class
    const response = await makeAuthenticatedRequest('GET', `/api/classes/${classInSchoolB.id}`, adminA.jwt);

    // Should either get 403 (forbidden) or empty/null data
    expect([403, 404, 200]).toContain(response.status);

    // If it returns 200, the class data should be empty/null
    if (response.status === 200) {
      expect(response.data.class).toBeNull();
    }
  });

  it('Admin B should NOT access School A classes via API', async () => {
    const response = await makeAuthenticatedRequest('GET', `/api/classes/${classInSchoolA.id}`, adminB.jwt);

    expect([403, 404, 200]).toContain(response.status);
    if (response.status === 200) {
      expect(response.data.class).toBeNull();
    }
  });

  it('Admin A should only see School A classes', async () => {
    const response = await makeAuthenticatedRequest('GET', '/api/classes', adminA.jwt);

    expect(response.status).toBe(200);
    // Response should contain School A classes, not School B
    const classes = response.data.classes || [];
    const schoolAIds = classes.map((c: any) => c.schoolId);
    const hasSchoolB = schoolAIds.includes(TEST_DATA.schools.schoolB);

    expect(hasSchoolB).toBe(false);
  });

  it('Admin B should only see School B classes', async () => {
    const response = await makeAuthenticatedRequest('GET', '/api/classes', adminB.jwt);

    expect(response.status).toBe(200);
    const classes = response.data.classes || [];
    const schoolBIds = classes.map((c: any) => c.schoolId);
    const hasSchoolA = schoolBIds.includes(TEST_DATA.schools.schoolA);

    expect(hasSchoolA).toBe(false);
  });

  it('Admin A cannot create faculty in School B', async () => {
    const response = await makeAuthenticatedRequest('POST', '/api/faculty', adminA.jwt, {
      schoolId: TEST_DATA.schools.schoolB,
      name: 'Fake Faculty',
      email: 'fake@schoolb.test',
    });

    // Should fail (403 or validation error)
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
