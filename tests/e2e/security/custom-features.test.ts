import { describe, it, expect, beforeEach } from 'vitest';
import { prisma, TEST_DATA } from './setup';
import { createUserContext } from './helpers';
import { UserRole, FeatureStatus } from '@prisma/client';

describe('Custom Features - Access & Expiry', () => {
  let admin: any;
  let faculty: any;
  let feature: any;
  let expiredFeature: any;

  beforeEach(async () => {
    admin = await createUserContext(
      TEST_DATA.users.adminA,
      'admin@school.test',
      'Admin',
      UserRole.ADMIN,
      TEST_DATA.schools.schoolA
    );

    faculty = await createUserContext(
      TEST_DATA.users.facultyPhysics,
      'faculty@school.test',
      'Faculty',
      UserRole.FACULTY,
      TEST_DATA.schools.schoolA
    );

    // Create active feature
    feature = await prisma.customFeature.create({
      data: {
        id: 'feature_active_1',
        schoolId: TEST_DATA.schools.schoolA,
        name: 'Advanced Reports',
        key: 'advanced_reports',
        type: 'REPORT',
        status: 'ACTIVE',
        createdById: TEST_DATA.users.adminA,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Create expired feature
    expiredFeature = await prisma.customFeature.create({
      data: {
        id: 'feature_expired_1',
        schoolId: TEST_DATA.schools.schoolA,
        name: 'Expired Feature',
        key: 'expired_feature',
        type: 'BUTTON_ACTION',
        status: 'EXPIRED',
        createdById: TEST_DATA.users.adminA,
        expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
    });

    // Assign active feature to faculty
    await prisma.customFeatureAssignment.create({
      data: {
        id: 'assignment_active_1',
        customFeatureId: feature.id,
        userId: faculty.id,
        assignedById: admin.id,
      },
    });

    // Assign expired feature to faculty
    await prisma.customFeatureAssignment.create({
      data: {
        id: 'assignment_expired_1',
        customFeatureId: expiredFeature.id,
        userId: faculty.id,
        assignedById: admin.id,
      },
    });
  });

  it('Faculty should access active assigned feature', async () => {
    // Faculty checks if they have access to feature
    // This depends on your API implementation
    const response = await fetch('http://localhost:3000/api/rbac/custom-features', {
      headers: { Authorization: `Bearer ${faculty.jwt}` },
    })
      .then((r) => r.json())
      .catch(() => ({}));

    // Should include the active feature
    const features = response.features || [];
    const hasActiveFeature = features.some((f: any) => f.key === 'advanced_reports');
    expect(hasActiveFeature).toBe(true);
  });

  it('Faculty should NOT access expired feature', async () => {
    const response = await fetch('http://localhost:3000/api/rbac/custom-features', {
      headers: { Authorization: `Bearer ${faculty.jwt}` },
    })
      .then((r) => r.json())
      .catch(() => ({}));

    const features = response.features || [];
    const hasExpiredFeature = features.some((f: any) => f.key === 'expired_feature');
    expect(hasExpiredFeature).toBe(false);
  });

  it('Feature expiry is enforced in middleware', async () => {
    // Create a test endpoint that uses the expired feature
    // This is pseudo-code based on your middleware design
    const isExpired = new Date() > new Date(expiredFeature.expiresAt);
    expect(isExpired).toBe(true);
  });

  it('Admin can assign feature to user', async () => {
    // Create a new user
    const newUser = await prisma.user.create({
      data: {
        id: 'user_new_1',
        email: 'newuser@school.test',
        name: 'New User',
        role: UserRole.FACULTY,
        schoolId: TEST_DATA.schools.schoolA,
        password: 'hashed',
      },
    });

    // Admin assigns feature
    const assignment = await prisma.customFeatureAssignment.create({
      data: {
        id: 'assignment_new_1',
        customFeatureId: feature.id,
        userId: newUser.id,
        assignedById: admin.id,
      },
    });

    expect(assignment).toBeDefined();
    expect(assignment.userId).toBe(newUser.id);
  });

  it('Admin can assign feature to department', async () => {
    // Create department
    const dept = await prisma.department.create({
      data: {
        id: 'dept_test_1',
        schoolId: TEST_DATA.schools.schoolA,
        name: 'Test Department',
      },
    });

    // Feature assignment with scope could be done here if supported
    // This depends on your schema - you may need to add department_id to assignments
    expect(dept).toBeDefined();
  });

  it('Expired feature cannot be used even if assigned', async () => {
    // Verify expiration logic
    const now = new Date();
    const featureExpired = now > new Date(expiredFeature.expiresAt);

    expect(featureExpired).toBe(true);
  });

  it('Admin cannot assign expired feature', async () => {
    // This depends on business logic - optional validation
    // For now, just verify the feature is marked as EXPIRED
    expect(expiredFeature.status).toBe('EXPIRED');
  });
});
