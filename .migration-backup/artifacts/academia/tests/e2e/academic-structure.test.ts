import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma, TEST_DATA, ensureGlobalSetup, cleanupTestData, cleanupAcademicStructure } from './setup';
import {
  makeAuthenticatedRequest,
  createAdminAContext,
  createAdminBContext,
  createTestAcademicYear,
  type TestUser,
} from './helpers';

describe('Academic Structure — CRUD & Tenant Isolation', () => {
  let adminA: TestUser;
  let adminB: TestUser;

  beforeAll(async () => {
    await cleanupAcademicStructure();
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupAcademicStructure();
    await cleanupTestData();
  });

  beforeEach(async () => {
    await ensureGlobalSetup();
    await cleanupAcademicStructure();
    adminA = await createAdminAContext();
    adminB = await createAdminBContext();
  });

  // ─── Academic Years ───────────────────────────────────────────────────────

  describe('POST /api/v1/academic-years — create', () => {
    it('creates an academic year for the authenticated school', async () => {
      const r = await makeAuthenticatedRequest('POST', '/api/v1/academic-years', adminA.jwt, {
        name: '2024-25',
        startDate: '2024-04-01T00:00:00.000Z',
        endDate: '2025-03-31T00:00:00.000Z',
      });
      expect(r.status).toBe(201);
      expect(r.data.data.academicYear.name).toBe('2024-25');
      expect(r.data.data.academicYear.schoolId).toBe(TEST_DATA.schools.schoolA);
      expect(r.data.data.academicYear.isCurrent).toBe(false);
      expect(r.data.data.academicYear.isLocked).toBe(false);
    });

    it('returns 400 for invalid name format', async () => {
      const r = await makeAuthenticatedRequest('POST', '/api/v1/academic-years', adminA.jwt, {
        name: 'invalid-year',
        startDate: '2024-04-01T00:00:00.000Z',
        endDate: '2025-03-31T00:00:00.000Z',
      });
      expect(r.status).toBe(400);
    });

    it('prevents duplicate name within the same school (unique constraint → 409)', async () => {
      await makeAuthenticatedRequest('POST', '/api/v1/academic-years', adminA.jwt, {
        name: '2024-25',
        startDate: '2024-04-01T00:00:00.000Z',
        endDate: '2025-03-31T00:00:00.000Z',
      });
      const r = await makeAuthenticatedRequest('POST', '/api/v1/academic-years', adminA.jwt, {
        name: '2024-25',
        startDate: '2024-04-01T00:00:00.000Z',
        endDate: '2025-03-31T00:00:00.000Z',
      });
      expect(r.status).toBe(409);
    });
  });

  describe('GET /api/v1/academic-years — list', () => {
    it('returns only years belonging to the authenticated school (tenant isolation)', async () => {
      await prisma.academicYear.createMany({
        data: [
          { schoolId: TEST_DATA.schools.schoolA, name: '2024-25', startDate: new Date('2024-04-01'), endDate: new Date('2025-03-31') },
          { schoolId: TEST_DATA.schools.schoolB, name: '2024-25', startDate: new Date('2024-04-01'), endDate: new Date('2025-03-31') },
        ],
      });

      const rA = await makeAuthenticatedRequest('GET', '/api/v1/academic-years', adminA.jwt);
      const rB = await makeAuthenticatedRequest('GET', '/api/v1/academic-years', adminB.jwt);

      expect(rA.status).toBe(200);
      expect(rB.status).toBe(200);

      for (const y of rA.data.data.academicYears) expect(y.schoolId).toBe(TEST_DATA.schools.schoolA);
      for (const y of rB.data.data.academicYears) expect(y.schoolId).toBe(TEST_DATA.schools.schoolB);
    });
  });

  describe('PATCH /api/v1/academic-years/[id] — update', () => {
    it('updates an academic year name', async () => {
      const yr = await createTestAcademicYear(TEST_DATA.schools.schoolA);
      const r = await makeAuthenticatedRequest('PATCH', `/api/v1/academic-years/${yr.id}`, adminA.jwt, {
        name: '2025-26',
        startDate: '2025-04-01T00:00:00.000Z',
        endDate: '2026-03-31T00:00:00.000Z',
      });
      expect(r.status).toBe(200);
      expect(r.data.data.academicYear.name).toBe('2025-26');
    });

    it('cannot update a locked year', async () => {
      const yr = await createTestAcademicYear(TEST_DATA.schools.schoolA, { isLocked: true });
      const r = await makeAuthenticatedRequest('PATCH', `/api/v1/academic-years/${yr.id}`, adminA.jwt, { name: '2025-26' });
      expect(r.status).toBe(409);
    });
  });

  describe('POST /api/v1/academic-years/[id]/set-current', () => {
    it('performs atomic current-year swap', async () => {
      const [yr1, yr2] = await Promise.all([
        createTestAcademicYear(TEST_DATA.schools.schoolA, { name: '2023-24', startDate: new Date('2023-04-01'), endDate: new Date('2024-03-31'), isCurrent: true }),
        createTestAcademicYear(TEST_DATA.schools.schoolA),
      ]);

      const r = await makeAuthenticatedRequest('POST', `/api/v1/academic-years/${yr2.id}/set-current`, adminA.jwt);
      expect(r.status).toBe(200);

      const [updated1, updated2] = await Promise.all([
        prisma.academicYear.findUnique({ where: { id: yr1.id } }),
        prisma.academicYear.findUnique({ where: { id: yr2.id } }),
      ]);
      expect(updated1?.isCurrent).toBe(false);
      expect(updated2?.isCurrent).toBe(true);
    });
  });

  describe('POST /api/v1/academic-years/[id]/lock', () => {
    it('locks an academic year', async () => {
      const yr = await createTestAcademicYear(TEST_DATA.schools.schoolA);
      const r = await makeAuthenticatedRequest('POST', `/api/v1/academic-years/${yr.id}/lock`, adminA.jwt);
      expect(r.status).toBe(200);
      expect(r.data.data.academicYear.isLocked).toBe(true);
    });

    it('cannot lock an already-locked year (409)', async () => {
      const yr = await createTestAcademicYear(TEST_DATA.schools.schoolA, { isLocked: true });
      const r = await makeAuthenticatedRequest('POST', `/api/v1/academic-years/${yr.id}/lock`, adminA.jwt);
      expect(r.status).toBe(409);
    });
  });

  describe('DELETE /api/v1/academic-years/[id]', () => {
    it('deletes an unlocked academic year', async () => {
      const yr = await createTestAcademicYear(TEST_DATA.schools.schoolA);
      const r = await makeAuthenticatedRequest('DELETE', `/api/v1/academic-years/${yr.id}`, adminA.jwt);
      expect(r.status).toBe(200);
      const found = await prisma.academicYear.findUnique({ where: { id: yr.id } });
      expect(found).toBeNull();
    });

    it('cannot delete a locked academic year (409)', async () => {
      const yr = await createTestAcademicYear(TEST_DATA.schools.schoolA, { isLocked: true });
      const r = await makeAuthenticatedRequest('DELETE', `/api/v1/academic-years/${yr.id}`, adminA.jwt);
      expect(r.status).toBe(409);
    });
  });

  // ─── Terms ────────────────────────────────────────────────────────────────

  describe('Terms sub-resource', () => {
    it('creates a term under an academic year', async () => {
      const yr = await createTestAcademicYear(TEST_DATA.schools.schoolA);
      const r = await makeAuthenticatedRequest('POST', `/api/v1/academic-years/${yr.id}/terms`, adminA.jwt, {
        name: 'FA1', examType: 'FORMATIVE', order: 1, weightage: 20,
      });
      expect(r.status).toBe(201);
      expect(r.data.data.term.name).toBe('FA1');
      expect(r.data.data.term.academicYearId).toBe(yr.id);
      expect(r.data.data.term.schoolId).toBe(TEST_DATA.schools.schoolA);
    });

    it('lists terms in order', async () => {
      const yr = await createTestAcademicYear(TEST_DATA.schools.schoolA);
      await prisma.term.createMany({
        data: [
          { schoolId: TEST_DATA.schools.schoolA, academicYearId: yr.id, name: 'FA2', examType: 'FORMATIVE', order: 2, weightage: 20 },
          { schoolId: TEST_DATA.schools.schoolA, academicYearId: yr.id, name: 'FA1', examType: 'FORMATIVE', order: 1, weightage: 20 },
        ],
      });
      const r = await makeAuthenticatedRequest('GET', `/api/v1/academic-years/${yr.id}/terms`, adminA.jwt);
      expect(r.status).toBe(200);
      expect(r.data.data.terms.length).toBe(2);
      expect(r.data.data.terms[0].order).toBe(1);
      expect(r.data.data.terms[1].order).toBe(2);
    });

    it('cannot create a term under a locked year (409)', async () => {
      const yr = await createTestAcademicYear(TEST_DATA.schools.schoolA, { isLocked: true });
      const r = await makeAuthenticatedRequest('POST', `/api/v1/academic-years/${yr.id}/terms`, adminA.jwt, {
        name: 'FA1', examType: 'FORMATIVE', order: 1, weightage: 20,
      });
      expect(r.status).toBe(409);
    });

    it('cannot delete a published term (409)', async () => {
      const yr = await createTestAcademicYear(TEST_DATA.schools.schoolA);
      const term = await prisma.term.create({
        data: { schoolId: TEST_DATA.schools.schoolA, academicYearId: yr.id, name: 'SA1', examType: 'SUMMATIVE', order: 3, weightage: 30, isPublished: true },
      });
      const r = await makeAuthenticatedRequest('DELETE', `/api/v1/academic-years/${yr.id}/terms/${term.id}`, adminA.jwt);
      expect(r.status).toBe(409);
    });
  });

  // ─── Grades ───────────────────────────────────────────────────────────────

  describe('Grades', () => {
    it('creates a grade', async () => {
      const r = await makeAuthenticatedRequest('POST', '/api/v1/grades', adminA.jwt, {
        name: 'Class 1', level: 1,
      });
      expect(r.status).toBe(201);
      expect(r.data.data.grade.name).toBe('Class 1');
      expect(r.data.data.grade.schoolId).toBe(TEST_DATA.schools.schoolA);
    });

    it('enforces tenant isolation on grade list', async () => {
      await prisma.grade.createMany({
        data: [
          { schoolId: TEST_DATA.schools.schoolA, name: 'Class 1', level: 1 },
          { schoolId: TEST_DATA.schools.schoolB, name: 'Class 1', level: 1 },
        ],
      });
      const [rA, rB] = await Promise.all([
        makeAuthenticatedRequest('GET', '/api/v1/grades', adminA.jwt),
        makeAuthenticatedRequest('GET', '/api/v1/grades', adminB.jwt),
      ]);
      for (const g of rA.data.data.grades) expect(g.schoolId).toBe(TEST_DATA.schools.schoolA);
      for (const g of rB.data.data.grades) expect(g.schoolId).toBe(TEST_DATA.schools.schoolB);
    });

    it('deletes a grade', async () => {
      const grade = await prisma.grade.create({
        data: { schoolId: TEST_DATA.schools.schoolA, name: 'Class 5', level: 5 },
      });
      const r = await makeAuthenticatedRequest('DELETE', `/api/v1/grades/${grade.id}`, adminA.jwt);
      expect(r.status).toBe(200);
      expect(await prisma.grade.findUnique({ where: { id: grade.id } })).toBeNull();
    });

    it('returns 404 for a grade in another school', async () => {
      const grade = await prisma.grade.create({
        data: { schoolId: TEST_DATA.schools.schoolB, name: 'Class 9', level: 9 },
      });
      const r = await makeAuthenticatedRequest('DELETE', `/api/v1/grades/${grade.id}`, adminA.jwt);
      expect(r.status).toBe(404);
    });
  });

  // ─── Sections ─────────────────────────────────────────────────────────────

  describe('Sections', () => {
    it('creates a section', async () => {
      const r = await makeAuthenticatedRequest('POST', '/api/v1/sections', adminA.jwt, { name: 'A' });
      expect(r.status).toBe(201);
      expect(r.data.data.section.name).toBe('A');
      expect(r.data.data.section.schoolId).toBe(TEST_DATA.schools.schoolA);
    });

    it('enforces tenant isolation on section list', async () => {
      await prisma.section.createMany({
        data: [
          { schoolId: TEST_DATA.schools.schoolA, name: 'A' },
          { schoolId: TEST_DATA.schools.schoolB, name: 'A' },
        ],
      });
      const r = await makeAuthenticatedRequest('GET', '/api/v1/sections', adminA.jwt);
      for (const s of r.data.data.sections) expect(s.schoolId).toBe(TEST_DATA.schools.schoolA);
    });

    it('deletes a section', async () => {
      const sec = await prisma.section.create({
        data: { schoolId: TEST_DATA.schools.schoolA, name: 'B' },
      });
      const r = await makeAuthenticatedRequest('DELETE', `/api/v1/sections/${sec.id}`, adminA.jwt);
      expect(r.status).toBe(200);
      expect(await prisma.section.findUnique({ where: { id: sec.id } })).toBeNull();
    });
  });

  // ─── Subjects ─────────────────────────────────────────────────────────────

  describe('Subjects', () => {
    it('creates a subject and normalizes code to uppercase', async () => {
      const r = await makeAuthenticatedRequest('POST', '/api/v1/subjects', adminA.jwt, {
        name: 'Mathematics', code: 'math', subjectType: 'MAIN',
      });
      expect(r.status).toBe(201);
      expect(r.data.data.subject.name).toBe('Mathematics');
      expect(r.data.data.subject.code).toBe('MATH');
      expect(r.data.data.subject.schoolId).toBe(TEST_DATA.schools.schoolA);
    });

    it('enforces tenant isolation on subject list', async () => {
      await prisma.subject.createMany({
        data: [
          { schoolId: TEST_DATA.schools.schoolA, name: 'Science', code: 'SCI', subjectType: 'MAIN' },
          { schoolId: TEST_DATA.schools.schoolB, name: 'Science', code: 'SCI', subjectType: 'MAIN' },
        ],
      });
      const [rA, rB] = await Promise.all([
        makeAuthenticatedRequest('GET', '/api/v1/subjects', adminA.jwt),
        makeAuthenticatedRequest('GET', '/api/v1/subjects', adminB.jwt),
      ]);
      for (const s of rA.data.data.subjects) expect(s.schoolId).toBe(TEST_DATA.schools.schoolA);
      for (const s of rB.data.data.subjects) expect(s.schoolId).toBe(TEST_DATA.schools.schoolB);
    });

    it('filters subjects by subjectType query param', async () => {
      await prisma.subject.createMany({
        data: [
          { schoolId: TEST_DATA.schools.schoolA, name: 'Maths', code: 'MTH', subjectType: 'MAIN' },
          { schoolId: TEST_DATA.schools.schoolA, name: 'Art', code: 'ART', subjectType: 'CO_CURRICULAR' },
        ],
      });
      const r = await makeAuthenticatedRequest('GET', '/api/v1/subjects?subjectType=CO_CURRICULAR', adminA.jwt);
      expect(r.status).toBe(200);
      for (const s of r.data.data.subjects) expect(s.subjectType).toBe('CO_CURRICULAR');
    });

    it('deletes a subject', async () => {
      const subj = await prisma.subject.create({
        data: { schoolId: TEST_DATA.schools.schoolA, name: 'History', code: 'HIS', subjectType: 'MAIN' },
      });
      const r = await makeAuthenticatedRequest('DELETE', `/api/v1/subjects/${subj.id}`, adminA.jwt);
      expect(r.status).toBe(200);
      expect(await prisma.subject.findUnique({ where: { id: subj.id } })).toBeNull();
    });
  });

  // ─── School + Config ──────────────────────────────────────────────────────

  describe('GET /api/v1/school', () => {
    it('returns the school record for the authenticated user', async () => {
      const r = await makeAuthenticatedRequest('GET', '/api/v1/school', adminA.jwt);
      expect(r.status).toBe(200);
      expect(r.data.data.school.id).toBe(TEST_DATA.schools.schoolA);
    });

    it('school A and B return different records (tenant isolation)', async () => {
      const [rA, rB] = await Promise.all([
        makeAuthenticatedRequest('GET', '/api/v1/school', adminA.jwt),
        makeAuthenticatedRequest('GET', '/api/v1/school', adminB.jwt),
      ]);
      expect(rA.data.data.school.id).toBe(TEST_DATA.schools.schoolA);
      expect(rB.data.data.school.id).toBe(TEST_DATA.schools.schoolB);
    });
  });

  describe('PATCH /api/v1/school/config — upsert', () => {
    it('creates config on first PATCH (upsert semantics)', async () => {
      await prisma.schoolConfig.deleteMany({ where: { schoolId: TEST_DATA.schools.schoolA } });
      const r = await makeAuthenticatedRequest('PATCH', '/api/v1/school/config', adminA.jwt, {
        gradingSystem: 'PERCENTAGE',
        workingDays: 5,
        academicYearStartMonth: 6,
      });
      expect(r.status).toBe(200);
      expect(r.data.data.config.gradingSystem).toBe('PERCENTAGE');
      expect(r.data.data.config.workingDays).toBe(5);
    });

    it('updates existing config on second PATCH', async () => {
      await makeAuthenticatedRequest('PATCH', '/api/v1/school/config', adminA.jwt, { workingDays: 5 });
      const r = await makeAuthenticatedRequest('PATCH', '/api/v1/school/config', adminA.jwt, { workingDays: 6 });
      expect(r.status).toBe(200);
      expect(r.data.data.config.workingDays).toBe(6);
    });
  });
});
