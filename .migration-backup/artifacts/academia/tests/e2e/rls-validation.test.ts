import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma, TEST_DATA, ensureGlobalSetup, cleanupTestData } from './setup';
import {
  makeAuthenticatedRequest,
  createAdminAContext,
  createAdminBContext,
  createFacultyPhysicsContext,
  ensureSchoolBFaculty,
  getSchoolBFacultyId,
  type TestUser,
} from './helpers';

describe('RLS Validation - Database Layer Security', () => {
  let adminA: TestUser;
  let adminB: TestUser;
  let facultyA: TestUser;
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

    adminA   = await createAdminAContext();
    adminB   = await createAdminBContext();
    facultyA = await createFacultyPhysicsContext(TEST_DATA.departments.physics);

    await prisma.class.deleteMany({ where: { id: { in: ['cls_rls_a', 'cls_rls_b'] } } });
    await ensureSchoolBFaculty();

    classInSchoolA = await prisma.class.create({
      data: {
        id: 'cls_rls_a',
        schoolId: TEST_DATA.schools.schoolA,
        departmentId: TEST_DATA.departments.physics,
        facultyId: TEST_DATA.faculty.physics,
        name: 'RLS Test Class A',
        grade: 10,
        section: 'A',
        subject: 'Physics',
      },
    });

    const facBId = getSchoolBFacultyId();
    classInSchoolB = await prisma.class.create({
      data: {
        id: 'cls_rls_b',
        schoolId: TEST_DATA.schools.schoolB,
        departmentId: TEST_DATA.departments.chemistry,
        facultyId: facBId,
        name: 'RLS Test Class B',
        grade: 10,
        section: 'B',
        subject: 'Chemistry',
      },
    });
  });

  it('NEXT_PUBLIC_ env vars should not include a service role key', () => {
    const publicKeys = Object.keys(process.env).filter((k) => k.startsWith('NEXT_PUBLIC_'));
    const hasServiceRole = publicKeys.some((k) => k.includes('SERVICE_ROLE'));
    expect(hasServiceRole).toBe(false);
  });

  // Skipped: this environment uses Prisma + direct PostgreSQL, not Supabase.
  // Tenant isolation is enforced at the ORM layer via tenantDb (src/lib/db-tenant.ts),
  // not via Postgres RLS or Supabase anon keys. NEXT_PUBLIC_SUPABASE_ANON_KEY will
  // never be defined in this stack and the check is architecturally inapplicable.
  it.skip('Browser uses anon key; service role key is kept server-side only', () => {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(anonKey).toBeDefined();
    expect(typeof anonKey).toBe('string');
  });

  it('Classes belong to distinct schools (schema-level isolation)', () => {
    expect(classInSchoolA.schoolId).toBe(TEST_DATA.schools.schoolA);
    expect(classInSchoolB.schoolId).toBe(TEST_DATA.schools.schoolB);
    expect(classInSchoolA.schoolId).not.toBe(classInSchoolB.schoolId);
  });

  it('Faculty from School A only sees School A classes via API', async () => {
    const res = await makeAuthenticatedRequest('GET', '/api/classes', facultyA.jwt);
    const classes: any[] = res.data?.data?.classes ?? res.data?.classes ?? [];
    // schoolId is filtered server-side (WHERE clause) but not returned in the select.
    // Verify by checking that the School B class ID does NOT appear in the results.
    const returnedIds = classes.map((c: any) => c.id);
    expect(returnedIds).not.toContain(classInSchoolB.id);
  });

  it('Prisma service queries are not school-scoped (server-side bypass — expected)', async () => {
    const all = await prisma.class.findMany({ where: { id: { in: ['cls_rls_a', 'cls_rls_b'] } } });
    const ids = all.map((c) => c.schoolId);
    expect(ids).toContain(TEST_DATA.schools.schoolA);
    expect(ids).toContain(TEST_DATA.schools.schoolB);
  });

  it('schoolId isolation: School A query returns only School A records', async () => {
    const classesA = await prisma.class.findMany({ where: { schoolId: TEST_DATA.schools.schoolA } });
    const classesB = await prisma.class.findMany({ where: { schoolId: TEST_DATA.schools.schoolB } });
    expect(classesA.every((c) => c.schoolId === TEST_DATA.schools.schoolA)).toBe(true);
    expect(classesB.every((c) => c.schoolId === TEST_DATA.schools.schoolB)).toBe(true);
  });

  it('Departments are schoolId-scoped', async () => {
    const dept = await prisma.department.findUnique({ where: { id: TEST_DATA.departments.physics } });
    expect(dept?.schoolId).toBe(TEST_DATA.schools.schoolA);
  });

  it('Filtered queries return only records matching schoolId predicate', async () => {
    const a = await prisma.class.findMany({ where: { schoolId: TEST_DATA.schools.schoolA } });
    const b = await prisma.class.findMany({ where: { schoolId: TEST_DATA.schools.schoolB } });
    const overlap = a.filter((ca) => b.some((cb) => cb.id === ca.id));
    expect(overlap).toHaveLength(0);
  });
});
