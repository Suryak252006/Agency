/**
 * TENANT_SCOPED_MODELS — coverage verification (unit test, no DB required)
 *
 * Sprint 1 R3 fix: this test acts as a living guard against two classes of bug:
 *
 *   A. A new schoolId model is added to schema.prisma without being added to
 *      TENANT_SCOPED_MODELS → cross-tenant data could leak.
 *
 *   B. Model names use the wrong casing. Prisma v6 passes PascalCase model
 *      names to $allModels query extensions ('Role', not 'role'). Using the
 *      wrong casing means schoolId is NEVER injected — a silent total bypass
 *      of tenant isolation. This test locks in the correct casing.
 *
 * When a new model with schoolId is added:
 *   1. Add it to TENANT_SCOPED_MODELS in src/lib/db-tenant-models.ts
 *      (PascalCase, matching the schema.prisma model name exactly)
 *   2. Add it to EXPECTED_SPRINT_1 (or the next sprint block) below
 *   3. Run this test — it must stay green
 *
 * This file imports from db-tenant-models.ts (not db-tenant.ts) to avoid
 * instantiating a Prisma client — no DATABASE_URL required.
 */

import { describe, it, expect } from 'vitest';
import {
  TENANT_SCOPED_MODELS,
  MODELS_WITHOUT_SCHOOL_ID,
} from '@/lib/db-tenant-models';

// ─── Sprint 1: all PascalCase model names that carry schoolId ────────────────
// IMPORTANT: must use PascalCase — Prisma v6 $allModels passes 'Role' not 'role'

const EXPECTED_SPRINT_1 = new Set([
  // Auth / config
  'User',
  'SchoolConfig',

  // RBAC
  'Role',
  'RoleAssignment',
  'CustomFeature',
  'CustomFeatureAssignment',
  'RBACLog',

  // Academic structure
  'Department',
  'Faculty',
  'Class',
  'Student',
  'Exam',

  // Marks workflow
  'Marks',
  'Request',

  // Audit / assets
  'AuditLog',
  'FileAsset',

  // Sprint 2 — academic entity structure (M03)
  'AcademicYear',
  'Term',
  'Grade',
  'Section',
  'Subject',
]);

// ─── Models explicitly excluded (no schoolId column of their own) ────────────

const EXPECTED_EXCLUDED = new Set([
  'Permission',
  'RolePermission',
  'FacultyDepartment',
  'ClassStudent',
  'MarksHistory',
]);

describe('TENANT_SCOPED_MODELS — Sprint 1 coverage', () => {
  it('contains exactly the right number of Sprint 1 models', () => {
    expect(TENANT_SCOPED_MODELS.size).toBe(EXPECTED_SPRINT_1.size);
  });

  it('includes every Sprint 1 model with a schoolId column (PascalCase)', () => {
    for (const model of EXPECTED_SPRINT_1) {
      expect(
        TENANT_SCOPED_MODELS.has(model),
        `Expected TENANT_SCOPED_MODELS to include '${model}' — add PascalCase name to db-tenant-models.ts`
      ).toBe(true);
    }
  });

  it('does not include models that have no schoolId column', () => {
    for (const model of EXPECTED_EXCLUDED) {
      expect(
        TENANT_SCOPED_MODELS.has(model),
        `'${model}' has no schoolId column and should NOT be in TENANT_SCOPED_MODELS`
      ).toBe(false);
    }
  });

  it('does not include the Tenant model itself', () => {
    // Tenant IS the root — it never needs schoolId injection
    expect(TENANT_SCOPED_MODELS.has('Tenant')).toBe(false);
    // Also confirm the old camelCase mistake is absent
    expect(TENANT_SCOPED_MODELS.has('tenant')).toBe(false);
  });

  it('all entries are PascalCase (no lowercase-first camelCase entries)', () => {
    for (const model of TENANT_SCOPED_MODELS) {
      expect(
        model[0],
        `Model '${model}' must start with an uppercase letter — Prisma v6 uses PascalCase in $allModels`
      ).toMatch(/[A-Z]/);
    }
  });
});

describe('MODELS_WITHOUT_SCHOOL_ID — exclusion list is correct', () => {
  it('contains all expected excluded models (PascalCase)', () => {
    for (const model of EXPECTED_EXCLUDED) {
      expect(
        MODELS_WITHOUT_SCHOOL_ID.has(model),
        `'${model}' should be in MODELS_WITHOUT_SCHOOL_ID to document why it is excluded`
      ).toBe(true);
    }
  });

  it('does not overlap with TENANT_SCOPED_MODELS', () => {
    const overlap = [...TENANT_SCOPED_MODELS].filter((m) => MODELS_WITHOUT_SCHOOL_ID.has(m));
    expect(overlap).toHaveLength(0);
  });

  it('all entries are PascalCase', () => {
    for (const model of MODELS_WITHOUT_SCHOOL_ID) {
      expect(model[0]).toMatch(/[A-Z]/);
    }
  });
});

describe('Sprint 2 — academic structure models present', () => {
  it('TENANT_SCOPED_MODELS has 21 models after Sprint 2 M03', () => {
    // Sprint 1: 16 models
    // Sprint 2 M03 adds: AcademicYear, Term, Grade, Section, Subject → 21
    expect(TENANT_SCOPED_MODELS.size).toBe(21);
  });

  it('contains every EXPECTED_SPRINT_1 model (including Sprint 2 additions)', () => {
    for (const model of EXPECTED_SPRINT_1) {
      expect(
        TENANT_SCOPED_MODELS.has(model),
        `Missing '${model}' — add it to db-tenant-models.ts`
      ).toBe(true);
    }
  });
});
