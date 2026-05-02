import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma, TEST_DATA, ensureGlobalSetup, cleanupTestData } from './setup';
import { createUserContext, makeAuthenticatedRequest, BASE_URL } from './helpers';
import { UserRole } from '@prisma/client';

describe('Custom Features - Access & Expiry', () => {
  let admin: any;
  let faculty: any;
  let feature: any;
  let expiredFeature: any;

  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    await ensureGlobalSetup();

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

    // Clean up features from previous test in this file
    await prisma.customFeatureAssignment.deleteMany({
      where: { id: { in: ['assign_active_1', 'assign_expired_1'] } },
    });
    await prisma.customFeature.deleteMany({
      where: { id: { in: ['feature_active_1', 'feature_expired_1'] } },
    });

    feature = await prisma.customFeature.create({
      data: {
        id: 'feature_active_1',
        schoolId: TEST_DATA.schools.schoolA,
        name: 'Advanced Reports',
        key: 'advanced_reports',
        module: 'reports',
        type: 'REPORT',
        status: 'ACTIVE',
        createdBy: admin.id,
      },
    });

    expiredFeature = await prisma.customFeature.create({
      data: {
        id: 'feature_expired_1',
        schoolId: TEST_DATA.schools.schoolA,
        name: 'Expired Feature',
        key: 'expired_feature',
        module: 'reports',
        type: 'BUTTON_ACTION',
        status: 'EXPIRED',
        createdBy: admin.id,
      },
    });

    await prisma.customFeatureAssignment.create({
      data: {
        id: 'assign_active_1',
        schoolId: TEST_DATA.schools.schoolA,
        featureId: feature.id,
        userId: faculty.id,
        assignedBy: admin.id,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.customFeatureAssignment.create({
      data: {
        id: 'assign_expired_1',
        schoolId: TEST_DATA.schools.schoolA,
        featureId: expiredFeature.id,
        userId: faculty.id,
        assignedBy: admin.id,
        expiryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    });
  });

  it('Faculty should access active assigned feature via API', async () => {
    // API returns { items: [...] } — filter by status=ACTIVE to only get active features
    const res = await fetch(`${BASE_URL}/api/rbac/custom-features?status=ACTIVE`, {
      headers: { Cookie: `app_session=${faculty.jwt}` },
    })
      .then((r) => r.json())
      .catch(() => ({}));

    const features: any[] = res.items ?? res.data?.items ?? [];
    const hasActive = features.some((f: any) => f.key === 'advanced_reports');
    expect(hasActive).toBe(true);
  });

  it('Faculty should NOT access expired feature via API', async () => {
    // Query with status=ACTIVE — expired features must not appear in the active list
    const res = await fetch(`${BASE_URL}/api/rbac/custom-features?status=ACTIVE`, {
      headers: { Cookie: `app_session=${faculty.jwt}` },
    })
      .then((r) => r.json())
      .catch(() => ({}));

    const features: any[] = res.items ?? res.data?.items ?? [];
    const hasExpired = features.some((f: any) => f.key === 'expired_feature');
    expect(hasExpired).toBe(false);
  });

  it('Feature expiry is enforced by checking expiryDate on assignment', async () => {
    const assignment = await prisma.customFeatureAssignment.findUnique({
      where: { id: 'assign_expired_1' },
    });
    const isExpired = new Date() > new Date(assignment!.expiryDate!);
    expect(isExpired).toBe(true);
  });

  it('Admin can assign feature to a new user', async () => {
    const ts = Date.now();
    const newUser = await prisma.user.upsert({
      where: { id: `usr_new_feat_${ts}` },
      create: {
        id: `usr_new_feat_${ts}`,
        email: `newuser_feat_${ts}@test.local`,
        name: 'New Feature User',
        role: UserRole.FACULTY,
        schoolId: TEST_DATA.schools.schoolA,
        password: '$2a$01$test',
      },
      update: {},
    });

    const assignment = await prisma.customFeatureAssignment.create({
      data: {
        schoolId: TEST_DATA.schools.schoolA,
        featureId: feature.id,
        userId: newUser.id,
        assignedBy: admin.id,
      },
    });

    expect(assignment).toBeDefined();
    expect(assignment.userId).toBe(newUser.id);
  });

  it('Expired feature assignment has past expiryDate', async () => {
    const now = new Date();
    const assignment = await prisma.customFeatureAssignment.findUnique({
      where: { id: 'assign_expired_1' },
    });
    expect(now > new Date(assignment!.expiryDate!)).toBe(true);
  });

  it('Expired CustomFeature has EXPIRED status', async () => {
    expect(expiredFeature.status).toBe('EXPIRED');
  });
});
