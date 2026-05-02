import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';

export const prisma = new PrismaClient();

export const TEST_DATA = {
  schools: {
    schoolA: 'schl_a_test',
    schoolB: 'schl_b_test',
  },
  users: {
    superAdmin:     'usr_super_test',
    adminA:         'usr_admin_a_test',
    adminB:         'usr_admin_b_test',
    hodPhysics:     'usr_hod_phy_test',
    hodMath:        'usr_hod_math_test',
    facultyPhysics: 'usr_fac_phy_test',
    facultyMath:    'usr_fac_math_test',
  },
  faculty: {
    physics: 'fac_phy_test',
    math:    'fac_math_test',
  },
  departments: {
    physics:     'dept_phy_test',
    mathematics: 'dept_math_test',
    chemistry:   'dept_chem_test',
  },
  roles: {
    admin:   'role_admin_test',
    faculty: 'role_faculty_test',
  },
} as const;

export const TEST_SCHOOL_IDS = [TEST_DATA.schools.schoolA, TEST_DATA.schools.schoolB];
export const TEST_PASSWORD_HASH = hashSync('TestPass123!', 1);

// ─────────────────────────────────────────────────────────────────────────────
// Cleanup — correct FK deletion order so no constraint errors
// ─────────────────────────────────────────────────────────────────────────────
export async function cleanupTestData(): Promise<void> {
  // 1. Leaf records first
  await prisma.marksHistory.deleteMany({ where: { marks: { schoolId: { in: TEST_SCHOOL_IDS } } } });
  await prisma.marks.deleteMany({ where: { schoolId: { in: TEST_SCHOOL_IDS } } });
  await prisma.classStudent.deleteMany({ where: { class: { schoolId: { in: TEST_SCHOOL_IDS } } } });
  await prisma.exam.deleteMany({ where: { schoolId: { in: TEST_SCHOOL_IDS } } });
  await prisma.class.deleteMany({ where: { schoolId: { in: TEST_SCHOOL_IDS } } });
  await prisma.student.deleteMany({ where: { schoolId: { in: TEST_SCHOOL_IDS } } });

  // 2. Feature assignments before features
  await prisma.customFeatureAssignment.deleteMany({ where: { schoolId: { in: TEST_SCHOOL_IDS } } });
  await prisma.customFeature.deleteMany({ where: { schoolId: { in: TEST_SCHOOL_IDS } } });

  // 3. Role assignments + role-linked records
  await prisma.rBACLog.deleteMany({ where: { schoolId: { in: TEST_SCHOOL_IDS } } });
  await prisma.roleAssignment.deleteMany({ where: { schoolId: { in: TEST_SCHOOL_IDS } } });
  await prisma.rolePermission.deleteMany({ where: { role: { schoolId: { in: TEST_SCHOOL_IDS } } } });
  await prisma.role.deleteMany({ where: { schoolId: { in: TEST_SCHOOL_IDS } } });

  // 4. Audit & requests
  await prisma.auditLog.deleteMany({ where: { schoolId: { in: TEST_SCHOOL_IDS } } });
  await prisma.request.deleteMany({ where: { schoolId: { in: TEST_SCHOOL_IDS } } });

  // 5. Faculty links → Faculty → Department (SetNull headId before dept delete)
  await prisma.facultyDepartment.deleteMany({ where: { faculty: { schoolId: { in: TEST_SCHOOL_IDS } } } });
  await prisma.faculty.deleteMany({ where: { schoolId: { in: TEST_SCHOOL_IDS } } });

  // 6. Nullify Department.headId so User deletion doesn't hit FK issues
  await prisma.department.updateMany({
    where: { schoolId: { in: TEST_SCHOOL_IDS } },
    data: { headId: null },
  });
  await prisma.department.deleteMany({ where: { schoolId: { in: TEST_SCHOOL_IDS } } });

  // 7. SchoolConfig before Tenant
  await prisma.schoolConfig.deleteMany({ where: { schoolId: { in: TEST_SCHOOL_IDS } } });

  // 8. Users last (all FK references above must be cleared first)
  await prisma.user.deleteMany({ where: { schoolId: { in: TEST_SCHOOL_IDS } } });

  // 9. Tenant records last (User → Tenant is Restrict, so User must be deleted first)
  await prisma.tenant.deleteMany({ where: { id: { in: TEST_SCHOOL_IDS } } });
}

// ─────────────────────────────────────────────────────────────────────────────
// Global setup — creates all foundational test fixtures idempotently
// ─────────────────────────────────────────────────────────────────────────────
export async function ensureGlobalSetup(): Promise<void> {
  const { schools, users, faculty, departments } = TEST_DATA;

  // ── Tenant records — must exist before any User (FK constraint) ────────────
  const tenantSeeds = [
    {
      id: schools.schoolA,
      slug: 'school-a-test',
      name: 'School A (Test)',
      board: 'CBSE' as const,
      subscriptionTier: 'PROFESSIONAL' as const,
      subscriptionStatus: 'ACTIVE' as const,
      isActive: true,
    },
    {
      id: schools.schoolB,
      slug: 'school-b-test',
      name: 'School B (Test)',
      board: 'CBSE' as const,
      subscriptionTier: 'PROFESSIONAL' as const,
      subscriptionStatus: 'ACTIVE' as const,
      isActive: true,
    },
  ];

  for (const t of tenantSeeds) {
    await prisma.tenant.upsert({
      where: { id: t.id },
      update: { name: t.name, isActive: t.isActive },
      create: t,
    });
  }

  // ── Users ──────────────────────────────────────────────────────────────────
  const userSeeds = [
    { id: users.superAdmin,     email: 'superadmin@test.local',  name: 'Super Admin',     role: 'ADMIN'   as const, schoolId: schools.schoolA },
    { id: users.adminA,         email: 'admin_a@test.local',     name: 'Admin A',         role: 'ADMIN'   as const, schoolId: schools.schoolA },
    { id: users.adminB,         email: 'admin_b@test.local',     name: 'Admin B',         role: 'ADMIN'   as const, schoolId: schools.schoolB },
    { id: users.hodPhysics,     email: 'hod.phy@test.local',     name: 'HOD Physics',    role: 'ADMIN'   as const, schoolId: schools.schoolA },
    { id: users.hodMath,        email: 'hod.math@test.local',    name: 'HOD Math',       role: 'ADMIN'   as const, schoolId: schools.schoolA },
    { id: users.facultyPhysics, email: 'fac.phy@test.local',     name: 'Faculty Physics', role: 'FACULTY' as const, schoolId: schools.schoolA },
    { id: users.facultyMath,    email: 'fac.math@test.local',    name: 'Faculty Math',    role: 'FACULTY' as const, schoolId: schools.schoolA },
  ];

  for (const u of userSeeds) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { email: u.email, name: u.name, schoolId: u.schoolId },
      create: { ...u, password: TEST_PASSWORD_HASH },
    });
  }

  // ── Faculty records — robust: remove any conflicting record first ──────────
  for (const [uid, fid, sid] of [
    [users.facultyPhysics, faculty.physics, schools.schoolA],
    [users.facultyMath,    faculty.math,    schools.schoolA],
  ] as const) {
    await prisma.faculty.deleteMany({ where: { id: fid, NOT: { userId: uid } } });
    await prisma.faculty.deleteMany({ where: { userId: uid, NOT: { id: fid } } });
    await prisma.faculty.upsert({
      where: { userId: uid },
      create: { id: fid, userId: uid, schoolId: sid },
      update: {},
    });
  }

  // ── Departments — robust upsert ────────────────────────────────────────────
  const deptSeeds: { id: string; schoolId: string; name: string; headId?: string }[] = [
    { id: departments.physics,     schoolId: schools.schoolA, name: 'Physics',     headId: users.hodPhysics },
    { id: departments.mathematics, schoolId: schools.schoolA, name: 'Mathematics', headId: users.hodMath },
    { id: departments.chemistry,   schoolId: schools.schoolB, name: 'Chemistry' },
  ];

  for (const d of deptSeeds) {
    await prisma.department.deleteMany({ where: { schoolId: d.schoolId, name: d.name, NOT: { id: d.id } } });
    await prisma.department.upsert({
      where: { id: d.id },
      create: d,
      update: d.headId ? { headId: d.headId } : {},
    });
  }

  // ── Faculty ↔ Department links ────────────────────────────────────────────
  await prisma.facultyDepartment.upsert({
    where: { facultyId_departmentId: { facultyId: faculty.physics, departmentId: departments.physics } },
    create: { facultyId: faculty.physics, departmentId: departments.physics, primary: true },
    update: {},
  });
  await prisma.facultyDepartment.upsert({
    where: { facultyId_departmentId: { facultyId: faculty.math, departmentId: departments.mathematics } },
    create: { facultyId: faculty.math, departmentId: departments.mathematics, primary: true },
    update: {},
  });
}
