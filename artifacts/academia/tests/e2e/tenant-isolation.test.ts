import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma, TEST_DATA, ensureGlobalSetup, cleanupTestData } from './setup';
import {
  makeAuthenticatedRequest,
  createAdminAContext,
  createAdminBContext,
  ensureSchoolBFaculty,
  getSchoolBFacultyId,
  type TestUser,
} from './helpers';

describe('Tenant Isolation - School A & B separation', () => {
  let adminA: TestUser;
  let adminB: TestUser;
  let classInSchoolA: any;
  let classInSchoolB: any;

  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    await ensureGlobalSetup();

    adminA = await createAdminAContext();
    adminB = await createAdminBContext();

    await prisma.class.deleteMany({ where: { id: { in: ['cls_tenant_a', 'cls_tenant_b'] } } });
    await ensureSchoolBFaculty();

    const facBId = getSchoolBFacultyId();

    classInSchoolA = await prisma.class.create({
      data: {
        id: 'cls_tenant_a',
        schoolId: TEST_DATA.schools.schoolA,
        departmentId: TEST_DATA.departments.physics,
        facultyId: TEST_DATA.faculty.physics,
        name: 'Tenant Class A',
        grade: 10,
        section: 'A',
        subject: 'Physics',
      },
    });

    classInSchoolB = await prisma.class.create({
      data: {
        id: 'cls_tenant_b',
        schoolId: TEST_DATA.schools.schoolB,
        departmentId: TEST_DATA.departments.chemistry,
        facultyId: facBId,
        name: 'Tenant Class B',
        grade: 10,
        section: 'B',
        subject: 'Chemistry',
      },
    });
  });

  it('Admin A should NOT access School B class via API', async () => {
    const res = await makeAuthenticatedRequest('GET', `/api/classes/${classInSchoolB.id}`, adminA.jwt);
    expect([403, 404, 200]).toContain(res.status);
    if (res.status === 200) {
      const cls = res.data?.data?.class ?? res.data?.class;
      // API returns undefined (field absent) when the class is outside the user's school
      expect(cls).toBeFalsy();
    }
  });

  it('Admin B should NOT access School A class via API', async () => {
    const res = await makeAuthenticatedRequest('GET', `/api/classes/${classInSchoolA.id}`, adminB.jwt);
    expect([403, 404, 200]).toContain(res.status);
    if (res.status === 200) {
      const cls = res.data?.data?.class ?? res.data?.class;
      // API returns undefined (field absent) when the class is outside the user's school
      expect(cls).toBeFalsy();
    }
  });

  it('Admin A class list contains only School A classes', async () => {
    const res = await makeAuthenticatedRequest('GET', '/api/classes', adminA.jwt);
    expect(res.status).toBe(200);
    const classes: any[] = res.data?.data?.classes ?? res.data?.classes ?? [];
    const hasSchoolB = classes.some((c: any) => c.schoolId === TEST_DATA.schools.schoolB);
    expect(hasSchoolB).toBe(false);
  });

  it('Admin B class list contains only School B classes', async () => {
    const res = await makeAuthenticatedRequest('GET', '/api/classes', adminB.jwt);
    expect(res.status).toBe(200);
    const classes: any[] = res.data?.data?.classes ?? res.data?.classes ?? [];
    const hasSchoolA = classes.some((c: any) => c.schoolId === TEST_DATA.schools.schoolA);
    expect(hasSchoolA).toBe(false);
  });

  it('Admin A cannot create a resource in School B', async () => {
    const res = await makeAuthenticatedRequest('POST', '/api/faculty', adminA.jwt, {
      schoolId: TEST_DATA.schools.schoolB,
      name: 'Cross-Tenant Faculty',
      email: 'cross@schoolb.test',
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
