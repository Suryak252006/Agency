import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll } from 'vitest';
import { cleanupTestData, seedAllTestData } from './seed-helpers';

// Shared Prisma instance for tests
export const prisma = new PrismaClient();

// Test data loaded from seed-helpers
export let TEST_DATA: any = {};

// Global seed lock to prevent parallel beforeAll hooks from competing
let seedingInProgress = false;
let seedingComplete = false;
let seedingPromise: Promise<any> = null;

/**
 * Setup test database with seeded data
 * Called once before all tests
 */
export async function setupTestDatabase() {
  console.log('\n🔧 Setting up test database...');
  // Wait for any ongoing seeding to complete
  if (seedingInProgress) {
    console.log('⏳ Waiting for seeding to complete...');
    await seedingPromise;
    console.log('✓ Using cached test data');
    return;
  }

  if (seedingComplete) {
    console.log('✓ Using cached test data (already seeded)');
    return;
  }

  seedingInProgress = true;
  seedingPromise = performSeeding();
  await seedingPromise;
}

async function performSeeding() {
  console.log('🌱 Beginning seeding...');

  try {
    // Cleanup any previous test data
    await cleanupTestData(prisma);

    // Seed fresh test data
    const data = await seedAllTestData(prisma);
    TEST_DATA = {
      schools: {
        schoolA: data.schoolA.school.id,
        schoolB: data.schoolB.school.id,
      },
      departments: {
        physics: data.schoolA.departments.physics.id,
        mathematics: data.schoolA.departments.math.id,
        chemistry: data.schoolB.departments.chemistry.id,
        biology: data.schoolB.departments.biology.id,
      },
      users: {
        superAdmin: data.schoolA.users.superAdmin.id,
        adminA: data.schoolA.users.admin.id,
        adminB: data.schoolB.users.admin.id,
        hodPhysics: data.schoolA.users.hodPhysics.id,
        hodMath: data.schoolA.users.hodMath.id,
        hodChemistry: data.schoolB.users.hodChemistry.id,
        hodBiology: data.schoolB.users.hodBiology.id,
        facultyPhysics: data.schoolA.users.facultyPhysics.id,
        facultyMath: data.schoolA.users.facultyMath.id,
        facultyChemistry: data.schoolB.users.facultyChemistry.id,
        facultyBiology: data.schoolB.users.facultyBiology.id,
        facultyShared: data.schoolA.users.facultyShared.id,
      },
      roles: {
        admin: data.schoolA.roles.admin.id,
        hod: data.schoolA.roles.hod.id,
        faculty: data.schoolA.roles.faculty.id,
      },
    };

  seedingComplete = true;
  seedingInProgress = false;

    console.log('✓ Test database setup complete\n');
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
}

/**
 * Teardown test database
 * Called once after all tests
 */
export async function teardownTestDatabase() {
  console.log('\n🧹 Cleaning up test database...');

  try {
    await cleanupTestData(prisma);
    await prisma.$disconnect();
    console.log('✓ Test database cleanup complete\n');
  } catch (error) {
    console.error('⚠️  Cleanup error:', error);
  }
}

// Hook into Vitest lifecycle
beforeAll(async () => {
  await setupTestDatabase();
}, 30000);

afterAll(async () => {
  await teardownTestDatabase();
});
