/**
 * RBAC Clone Isolation
 *
 * Verifies that the cloneFromRoleId feature in POST /api/rbac/roles cannot be
 * used to copy permission lists from a foreign school's role.
 *
 * Sprint 1 R1 fix: the route now uses tdb.role.findFirst (tenant-scoped) instead
 * of db.role.findUnique (global) to look up the clone source. If the source role
 * belongs to a different school, tenantDb injects schoolId into the WHERE clause
 * and the lookup returns null — no permissions are cloned.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma, TEST_DATA, ensureGlobalSetup, cleanupTestData } from './setup';
import { tenantDb } from '@/lib/db-tenant';

describe('RBAC Clone Isolation — cloneFromRoleId is tenant-scoped', () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    await ensureGlobalSetup();
  });

  it('tenantDb.role.findFirst cannot locate a role from a different school', async () => {
    const ts = Date.now();

    // Create a role with a unique permission in School A
    const schoolARole = await prisma.role.create({
      data: {
        schoolId: TEST_DATA.schools.schoolA,
        name: `Secret Role A ${ts}`,
        createdBy: TEST_DATA.users.adminA,
      },
    });

    const secretPerm = await prisma.permission.upsert({
      where: { key: `clone_test_secret_${ts}` },
      create: { key: `clone_test_secret_${ts}`, module: 'clone_test', action: 'secret' },
      update: {},
    });

    await prisma.rolePermission.create({
      data: { roleId: schoolARole.id, permissionId: secretPerm.id },
    });

    // School B admin tries to clone School A's role via tenantDb (schoolB-scoped)
    const tdbB = tenantDb(TEST_DATA.schools.schoolB);
    const found = await tdbB.role.findFirst({
      where: { id: schoolARole.id },
      select: { permissions: { select: { permissionId: true } } },
    });

    // tenantDb injects WHERE schoolId = schoolB, so School A's role is not found
    expect(found).toBeNull();

    // Verify the role and permission exist in the DB (it's a data isolation issue, not data loss)
    const actualRole = await prisma.role.findUnique({ where: { id: schoolARole.id } });
    expect(actualRole).not.toBeNull();
    expect(actualRole!.schoolId).toBe(TEST_DATA.schools.schoolA);

    // Clean up
    await prisma.rolePermission.deleteMany({ where: { roleId: schoolARole.id } });
    await prisma.role.delete({ where: { id: schoolARole.id } });
  });

  it('tenantDb.role.findFirst CAN locate a role within the same school', async () => {
    const ts = Date.now();

    // Create a role with a permission in School A
    const schoolARole = await prisma.role.create({
      data: {
        schoolId: TEST_DATA.schools.schoolA,
        name: `Cloneable Role A ${ts}`,
        createdBy: TEST_DATA.users.adminA,
      },
    });

    const perm = await prisma.permission.upsert({
      where: { key: `clone_test_visible_${ts}` },
      create: { key: `clone_test_visible_${ts}`, module: 'clone_test', action: 'visible' },
      update: {},
    });

    await prisma.rolePermission.create({
      data: { roleId: schoolARole.id, permissionId: perm.id },
    });

    // School A admin can clone within their own school
    const tdbA = tenantDb(TEST_DATA.schools.schoolA);
    const found = await tdbA.role.findFirst({
      where: { id: schoolARole.id },
      select: { permissions: { select: { permissionId: true } } },
    });

    expect(found).not.toBeNull();
    expect(found!.permissions).toHaveLength(1);
    expect(found!.permissions[0].permissionId).toBe(perm.id);

    // Clean up
    await prisma.rolePermission.deleteMany({ where: { roleId: schoolARole.id } });
    await prisma.role.delete({ where: { id: schoolARole.id } });
  });

  it('cross-tenant cloneFromRoleId results in a new role with zero permissions', async () => {
    const ts = Date.now();

    // Set up School A role with permissions
    const schoolARole = await prisma.role.create({
      data: {
        schoolId: TEST_DATA.schools.schoolA,
        name: `Isolated Role A ${ts}`,
        createdBy: TEST_DATA.users.adminA,
      },
    });

    const perm = await prisma.permission.upsert({
      where: { key: `clone_test_isolated_${ts}` },
      create: { key: `clone_test_isolated_${ts}`, module: 'clone_test', action: 'isolated' },
      update: {},
    });
    await prisma.rolePermission.create({ data: { roleId: schoolARole.id, permissionId: perm.id } });

    // Simulate what the fixed POST /api/rbac/roles handler does:
    // tdb is scoped to School B; cloneFromRoleId points to a School A role
    const tdbB = tenantDb(TEST_DATA.schools.schoolB);
    const cloneSource = await tdbB.role.findFirst({
      where: { id: schoolARole.id },
      select: { permissions: { select: { permissionId: true } } },
    });

    // Source not found — the fixed code will use an empty finalPermissionIds
    const finalPermissionIds = cloneSource
      ? cloneSource.permissions.map((p) => p.permissionId)
      : [];

    expect(cloneSource).toBeNull();
    expect(finalPermissionIds).toHaveLength(0);

    // Create the new role in School B — it should have no permissions
    const newRoleB = await prisma.role.create({
      data: {
        schoolId: TEST_DATA.schools.schoolB,
        name: `Cloned (empty) Role B ${ts}`,
        createdBy: TEST_DATA.users.adminB,
      },
    });

    if (finalPermissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: finalPermissionIds.map((permId) => ({ roleId: newRoleB.id, permissionId: permId })),
        skipDuplicates: true,
      });
    }

    const assignedPerms = await prisma.rolePermission.findMany({ where: { roleId: newRoleB.id } });
    expect(assignedPerms).toHaveLength(0); // No permissions leaked from School A

    // Clean up
    await prisma.role.delete({ where: { id: newRoleB.id } });
    await prisma.rolePermission.deleteMany({ where: { roleId: schoolARole.id } });
    await prisma.role.delete({ where: { id: schoolARole.id } });
  });
});
