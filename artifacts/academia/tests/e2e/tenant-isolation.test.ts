import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma, TEST_DATA, ensureGlobalSetup, cleanupTestData } from './setup';
import { createUserContext, makeAuthenticatedRequest } from './helpers';
import { UserRole } from '@prisma/client';

describe('Tenant Isolation - School A & B separation', () => {
  let adminA: any;
  let adminB: any;
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

    adminA = await createUserContext(
      TEST_DATA.users.adminA,
      'admin_a@test.local',
      'Admin A',
      UserRole.ADMIN,
      TEST_DATA.schools.schoolA
    );

    adminB = await createUserContext(
      TEST_DATA.users.adminB,
      'admin_b@test.local',
      'Admin B',
      UserRole.ADMIN,
      TEST_DATA.schools.schoolB
    );

    await prisma.class.deleteMany({ where: { id: { in: ['cls_tenant_a', 'cls_tenant_b'] } } });
    await ensureSchoolBFaculty();

    const facBId = await getSchoolBFacultyId();

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

async function ensureSchoolBFaculty(): Promise<void> {
  await prisma.user.upsert({
    where: { id: 'usr_fac_b_tenant' },
    create: {
      id: 'usr_fac_b_tenant',
      email: 'fac_b_tenant@test.local',
      name: 'Faculty B Tenant',
      role: 'FACULTY',
      schoolId: TEST_DATA.schools.schoolB,
      password: '$2a$01$stub',
    },
    update: {},
  });

  // Remove any conflicting faculty records before upserting
  await prisma.faculty.deleteMany({ where: { id: 'fac_b_tenant', NOT: { userId: 'usr_fac_b_tenant' } } });
  await prisma.faculty.deleteMany({ where: { userId: 'usr_fac_b_tenant', NOT: { id: 'fac_b_tenant' } } });

  await prisma.faculty.upsert({
    where: { userId: 'usr_fac_b_tenant' },
    create: { id: 'fac_b_tenant', userId: 'usr_fac_b_tenant', schoolId: TEST_DATA.schools.schoolB },
    update: {},
  });
}

async function getSchoolBFacultyId(): Promise<string> {
  const fac = await prisma.faculty.findUnique({ where: { userId: 'usr_fac_b_tenant' } });
  return fac!.id;
}
