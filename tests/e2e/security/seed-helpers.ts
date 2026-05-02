/**
 * Test Data Seed Helpers (Deterministic)
 * 
 * Idempotent functions using email-based upserts.
 * All test data uses "rbac-test-" namespace to avoid conflicts.
 * Safe to run multiple times.
 */

import { PrismaClient, UserRole } from '@prisma/client';

// Test namespace - all test data uses this prefix
const TEST_NS = 'rbac-test';

/**
 * Get or create system user (deterministic by email)
 */
export async function ensureSystemUser(prisma: PrismaClient): Promise<string> {
  const systemEmail = `${TEST_NS}-system@local.test`;

  const systemUser = await prisma.user.upsert({
    where: { email: systemEmail },
    update: {},
    create: {
      email: systemEmail,
      name: 'RBAC Test System',
      role: UserRole.ADMIN,
      schoolId: 'system',
      password: 'hashed_system_password',
    },
  });

  return systemUser.id; // Return the captured id
}

/**
 * Create or get a test school
 */
export async function seedSchool(prisma: PrismaClient, schoolKey: string, name: string) {
  const schoolId = `${TEST_NS}-school-${schoolKey}`;
  return { id: schoolId, name };
}

/**
 * Create or get a test department
 */
export async function seedDepartment(
  prisma: PrismaClient,
  schoolId: string,
  deptKey: string,
  name: string
) {
  const deptId = `${TEST_NS}-dept-${deptKey}`;

  const department = await prisma.department.upsert({
    where: { id: deptId },
    update: { name },
    create: {
      id: deptId,
      schoolId,
      name,
    },
  });

  return department;
}

/**
 * Create or get a test user (deterministic by email)
 */
export async function seedUser(
  prisma: PrismaClient,
  userKey: string,
  name: string,
  role: UserRole,
  schoolId: string,
  email?: string
) {
  const userEmail = email || `${TEST_NS}-${userKey}@local.test`;

  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: { name, role },
    create: {
      email: userEmail,
      name,
      role,
      schoolId,
      password: 'hashed_test_password_do_not_use',
    },
  });

  return user;
}

/**
 * Create or get a test faculty profile
 */
export async function seedFacultyProfile(prisma: PrismaClient, userId: string, schoolId: string) {
  const faculty = await prisma.faculty.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      schoolId,
    },
  });

  return faculty;
}

/**
 * Create or get a test role (deterministic by schoolId + name)
 */
export async function seedRole(
  prisma: PrismaClient,
  schoolId: string,
  roleKey: string,
  name: string,
  systemUserId: string
) {
  // Use composite unique on (schoolId, name) for deterministic lookups
  const role = await prisma.role.upsert({
    where: {
      schoolId_name: { schoolId, name },
    },
    update: {},
    create: {
      schoolId,
      name,
      createdBy: systemUserId,
    },
  });

  return role;
}

/**
 * Assign role to user (deterministic by composite unique key)
 * Handles both department-scoped and global assignments.
 */
export async function seedRoleAssignment(
  prisma: PrismaClient,
  userId: string,
  roleId: string,
  schoolId: string,
  departmentId?: string
) {
  const systemUserId = await ensureSystemUser(prisma);

  let assignment;

  if (departmentId) {
    // Department-scoped: use composite unique with departmentId
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
        assignedBy: systemUserId,
      },
    });
  } else {
    // Global (department-scoped): use findFirst then create
    // Cannot use composite unique with null in where clause
    const existing = await prisma.roleAssignment.findFirst({
      where: {
        userId,
        roleId,
        schoolId,
        departmentId: null,
      },
    });

    if (existing) {
      assignment = existing;
    } else {
      assignment = await prisma.roleAssignment.create({
        data: {
          userId,
          roleId,
          schoolId,
          departmentId: null,
          assignedBy: systemUserId,
        },
      });
    }
  }

  return assignment;
}

/**
 * Complete seed for School A test data
 */
export async function seedSchoolA(prisma: PrismaClient) {
  const schoolId = `${TEST_NS}-school-a`;
  const systemUserId = await ensureSystemUser(prisma);

  // Create departments
  const physicsDept = await seedDepartment(prisma, schoolId, 'physics', 'Physics Department');
  const mathDept = await seedDepartment(prisma, schoolId, 'math', 'Mathematics Department');

  // Create users (email-based, deterministic)
  const superAdmin = await seedUser(prisma, 'super-admin-a', 'Super Admin', UserRole.ADMIN, schoolId, `${TEST_NS}-super-admin-a@local.test`);
  const admin = await seedUser(prisma, 'admin-a', 'Admin A', UserRole.ADMIN, schoolId, `${TEST_NS}-admin-a@local.test`);
  const hodPhysics = await seedUser(prisma, 'hod-physics-a', 'HOD Physics', UserRole.ADMIN, schoolId, `${TEST_NS}-hod-physics-a@local.test`);
  const hodMath = await seedUser(prisma, 'hod-math-a', 'HOD Math', UserRole.ADMIN, schoolId, `${TEST_NS}-hod-math-a@local.test`);
  const facultyPhysics = await seedUser(prisma, 'faculty-physics-a', 'Faculty Physics', UserRole.FACULTY, schoolId, `${TEST_NS}-faculty-physics-a@local.test`);
  const facultyMath = await seedUser(prisma, 'faculty-math-a', 'Faculty Math', UserRole.FACULTY, schoolId, `${TEST_NS}-faculty-math-a@local.test`);
  const facultyShared = await seedUser(prisma, 'faculty-shared-a', 'Faculty Physics & Math', UserRole.FACULTY, schoolId, `${TEST_NS}-faculty-shared-a@local.test`);

  // Create faculty profiles
  await seedFacultyProfile(prisma, facultyPhysics.id, schoolId);
  await seedFacultyProfile(prisma, facultyMath.id, schoolId);
  await seedFacultyProfile(prisma, facultyShared.id, schoolId);

  // Create roles (deterministic by schoolId + name)
  const roleAdmin = await seedRole(prisma, schoolId, 'admin', 'Admin', systemUserId);
  const roleHod = await seedRole(prisma, schoolId, 'hod', 'HOD', systemUserId);
  const roleFaculty = await seedRole(prisma, schoolId, 'faculty', 'Faculty', systemUserId);

  // Assign roles
  await seedRoleAssignment(prisma, admin.id, roleAdmin.id, schoolId);
  await seedRoleAssignment(prisma, hodPhysics.id, roleHod.id, schoolId, physicsDept.id);
  await seedRoleAssignment(prisma, hodMath.id, roleHod.id, schoolId, mathDept.id);
  await seedRoleAssignment(prisma, facultyPhysics.id, roleFaculty.id, schoolId, physicsDept.id);
  await seedRoleAssignment(prisma, facultyMath.id, roleFaculty.id, schoolId, mathDept.id);
  await seedRoleAssignment(prisma, facultyShared.id, roleFaculty.id, schoolId, physicsDept.id);
  await seedRoleAssignment(prisma, facultyShared.id, roleFaculty.id, schoolId, mathDept.id);

  return {
    school: { id: schoolId },
    departments: { physics: physicsDept, math: mathDept },
    users: { superAdmin, admin, hodPhysics, hodMath, facultyPhysics, facultyMath, facultyShared },
    roles: { admin: roleAdmin, hod: roleHod, faculty: roleFaculty },
  };
}

/**
 * Complete seed for School B test data
 */
export async function seedSchoolB(prisma: PrismaClient) {
  const schoolId = `${TEST_NS}-school-b`;
  const systemUserId = await ensureSystemUser(prisma);

  // Create departments
  const chemistryDept = await seedDepartment(prisma, schoolId, 'chemistry-b', 'Chemistry Department');
  const biologyDept = await seedDepartment(prisma, schoolId, 'biology-b', 'Biology Department');

  // Create users (email-based, deterministic)
  const admin = await seedUser(prisma, 'admin-b', 'Admin B', UserRole.ADMIN, schoolId, `${TEST_NS}-admin-b@local.test`);
  const hodChemistry = await seedUser(prisma, 'hod-chemistry-b', 'HOD Chemistry', UserRole.ADMIN, schoolId, `${TEST_NS}-hod-chemistry-b@local.test`);
  const hodBiology = await seedUser(prisma, 'hod-biology-b', 'HOD Biology', UserRole.ADMIN, schoolId, `${TEST_NS}-hod-biology-b@local.test`);
  const facultyChemistry = await seedUser(prisma, 'faculty-chemistry-b', 'Faculty Chemistry', UserRole.FACULTY, schoolId, `${TEST_NS}-faculty-chemistry-b@local.test`);
  const facultyBiology = await seedUser(prisma, 'faculty-biology-b', 'Faculty Biology', UserRole.FACULTY, schoolId, `${TEST_NS}-faculty-biology-b@local.test`);

  // Create faculty profiles
  await seedFacultyProfile(prisma, facultyChemistry.id, schoolId);
  await seedFacultyProfile(prisma, facultyBiology.id, schoolId);

  // Create roles (deterministic by schoolId + name)
  const roleAdmin = await seedRole(prisma, schoolId, 'admin', 'Admin', systemUserId);
  const roleHod = await seedRole(prisma, schoolId, 'hod', 'HOD', systemUserId);
  const roleFaculty = await seedRole(prisma, schoolId, 'faculty', 'Faculty', systemUserId);

  // Assign roles
  await seedRoleAssignment(prisma, admin.id, roleAdmin.id, schoolId);
  await seedRoleAssignment(prisma, hodChemistry.id, roleHod.id, schoolId, chemistryDept.id);
  await seedRoleAssignment(prisma, hodBiology.id, roleHod.id, schoolId, biologyDept.id);
  await seedRoleAssignment(prisma, facultyChemistry.id, roleFaculty.id, schoolId, chemistryDept.id);
  await seedRoleAssignment(prisma, facultyBiology.id, roleFaculty.id, schoolId, biologyDept.id);

  return {
    school: { id: schoolId },
    departments: { chemistry: chemistryDept, biology: biologyDept },
    users: { admin, hodChemistry, hodBiology, facultyChemistry, facultyBiology },
    roles: { admin: roleAdmin, hod: roleHod, faculty: roleFaculty },
  };
}

/**
 * Cleanup all test data (email-based)
 */
export async function cleanupTestData(prisma: PrismaClient) {
  try {
    console.log('🧹 Cleaning test data...');

    // Delete in reverse dependency order
    await prisma.customFeatureAssignment.deleteMany({ where: { id: { startsWith: TEST_NS } } });
    await prisma.customFeature.deleteMany({ where: { id: { startsWith: TEST_NS } } });
    await prisma.roleAssignment.deleteMany({ where: { id: { startsWith: TEST_NS } } });
    await prisma.rolePermission.deleteMany({ where: { role: { id: { startsWith: TEST_NS } } } });
    await prisma.permission.deleteMany({ where: { id: { startsWith: TEST_NS } } });
    await prisma.role.deleteMany({ where: { id: { startsWith: TEST_NS } } });
    await prisma.rBACLog.deleteMany({ where: { id: { startsWith: TEST_NS } } });
    await prisma.auditLog.deleteMany({ where: { id: { startsWith: TEST_NS } } });
    await prisma.faculty.deleteMany({ where: { id: { startsWith: TEST_NS } } });
    await prisma.classStudent.deleteMany({ where: { class: { id: { startsWith: TEST_NS } } } });
    await prisma.student.deleteMany({ where: { id: { startsWith: TEST_NS } } });
    await prisma.exam.deleteMany({ where: { id: { startsWith: TEST_NS } } });
    await prisma.class.deleteMany({ where: { id: { startsWith: TEST_NS } } });
    await prisma.departmentHead.deleteMany({ where: { id: { startsWith: TEST_NS } } });
    await prisma.department.deleteMany({ where: { id: { startsWith: TEST_NS } } });
    await prisma.user.deleteMany({ where: { OR: [{ id: { startsWith: TEST_NS } }, { email: { contains: TEST_NS } }] } });

    console.log('✓ Test data cleaned');
  } catch (error) {
    console.warn('⚠️  Cleanup warning (expected if no test data exists):', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Seed all test data
 */
export async function seedAllTestData(prisma: PrismaClient) {
  await cleanupTestData(prisma);
  console.log('🌱 Seeding School A...');
  const schoolA = await seedSchoolA(prisma);
  console.log('🌱 Seeding School B...');
  const schoolB = await seedSchoolB(prisma);
  console.log('✓ Test data seeded');
  return { schoolA, schoolB };
}

/**
 * CLI runner for seeding test data
 */
async function main() {
  const prisma = new PrismaClient();
  try {
    const data = await seedAllTestData(prisma);
    console.log('\n📋 Test Data Summary:');
    console.log('School A Users:', Object.keys(data.schoolA.users));
    console.log('School B Users:', Object.keys(data.schoolB.users));
    console.log('\n✓ Ready to run tests');
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

// Run if executed directly
if (require.main === module) {
  main();
}
