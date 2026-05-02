# 🔒 Backend Validation Pattern - Phase 3 Implementation Guide

**Critical**: All API routes MUST follow this pattern. UI hiding is NOT sufficient.

---

## Quick Reference: Three-Layer Check Pattern

Every API route handling department-scoped data must implement:

```typescript
/**
 * LAYER 1: Authentication
 * LAYER 2: Permission + Department Context
 * LAYER 3: Data Ownership Validation
 */

export async function PATCH(req, { params }) {
  // LAYER 1: Get authenticated user
  const session = await getAppSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // LAYER 2: Check permission + department access
  const { departmentId } = params;
  if (!userHasPermissionWithDepartment(
    session.user,
    'resource.edit',
    departmentId
  )) {
    return NextResponse.json(
      { error: 'Permission denied for this department' },
      { status: 403 }
    );
  }

  // LAYER 3: Verify user can access this department
  if (!canAccessDepartment(session.user, departmentId, getUserDepartmentIds(session.user))) {
    return NextResponse.json(
      { error: 'No access to this department' },
      { status: 403 }
    );
  }

  // Safe: Proceed with logic
}
```

---

## Pattern 1: Exams (Department-Scoped Resource)

### GET /api/exams?departmentId=xxx - List exams in department

```typescript
import { getAppSession } from '@/lib/supabase/middleware';
import { userHasPermissionWithDepartment, canAccessDepartment, getUserDepartmentIds } from '@/lib/rbac/utils';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const session = await getAppSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get('departmentId');

  // LAYER 2: Permission check
  if (!userHasPermissionWithDepartment(session.user, 'exams.view', departmentId)) {
    return NextResponse.json(
      { error: 'No permission to view exams' },
      { status: 403 }
    );
  }

  // LAYER 3: Department access check
  const userDepts = getUserDepartmentIds(session.user);
  if (!canAccessDepartment(session.user, departmentId, userDepts)) {
    return NextResponse.json(
      { error: 'No access to this department' },
      { status: 403 }
    );
  }

  // ✓ Safe: Fetch exams
  const exams = await prisma.exam.findMany({
    where: {
      schoolId: session.user.schoolId,
      departmentId, // ← Department filter
    },
  });

  return NextResponse.json(exams);
}
```

### PATCH /api/exams/[id] - Update exam

```typescript
export async function PATCH(req, { params }) {
  const session = await getAppSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const exam = await prisma.exam.findUnique({ where: { id: params.id } });
  if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // LAYER 2: Permission check with exam's department
  if (!userHasPermissionWithDepartment(session.user, 'exams.edit', exam.departmentId)) {
    return NextResponse.json(
      { error: 'No permission to edit exams in this department' },
      { status: 403 }
    );
  }

  // LAYER 3: Department access check
  if (!canAccessDepartment(session.user, exam.departmentId, getUserDepartmentIds(session.user))) {
    return NextResponse.json(
      { error: 'No access to this department' },
      { status: 403 }
    );
  }

  // ✓ Safe: Update exam
  const updated = await prisma.exam.update({
    where: { id: params.id },
    data: await req.json(),
  });

  return NextResponse.json(updated);
}
```

---

## Pattern 2: Faculty Management (Department-Scoped Access)

### GET /api/faculty?departmentId=xxx - List faculty in department

```typescript
export async function GET(req) {
  const session = await getAppSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get('departmentId');

  // LAYER 2: Permission check
  if (!userHasPermissionWithDepartment(session.user, 'faculty.view', departmentId)) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  // LAYER 3: Department access (HOD restriction)
  if (!canAccessDepartment(session.user, departmentId, getUserDepartmentIds(session.user))) {
    return NextResponse.json({ error: 'No access to this department' }, { status: 403 });
  }

  // ✓ Safe: For HOD, auto-filter to their department
  const faculty = await prisma.faculty.findMany({
    where: {
      schoolId: session.user.schoolId,
      departments: {
        some: {
          departmentId, // ← Department filter
        },
      },
    },
    include: {
      user: true,
      departments: true,
    },
  });

  return NextResponse.json(faculty);
}
```

### POST /api/faculty/[id]/assign-department - Assign faculty to department

```typescript
export async function POST(req, { params }) {
  const session = await getAppSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { departmentId } = await req.json();
  const faculty = await prisma.faculty.findUnique({
    where: { id: params.id },
    include: { departments: true },
  });

  if (!faculty) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // LAYER 2: Permission check
  if (!userHasPermissionWithDepartment(session.user, 'faculty.assign', departmentId)) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  // LAYER 3: Manager can only assign faculty in their departments
  const facultyDepts = faculty.departments.map(d => ({ id: d.departmentId }));
  if (!canManageFacultyInDepartment(
    session.user,
    facultyDepts,
    getUserDepartmentIds(session.user)
  )) {
    return NextResponse.json(
      { error: 'Cannot manage faculty outside your department' },
      { status: 403 }
    );
  }

  // ✓ Safe: Assign to department
  const assignment = await prisma.facultyDepartment.create({
    data: {
      facultyId: faculty.id,
      departmentId,
      primary: false,
    },
  });

  return NextResponse.json(assignment);
}
```

---

## Pattern 3: Marks Approval (HOD Only, Department-Scoped)

### GET /api/marks?departmentId=xxx - List marks in department

```typescript
export async function GET(req) {
  const session = await getAppSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get('departmentId');

  // LAYER 2: Permission check
  if (!userHasPermissionWithDepartment(session.user, 'marks.view', departmentId)) {
    return NextResponse.json({ error: 'No permission to view marks' }, { status: 403 });
  }

  // LAYER 3: Department access
  if (!canAccessDepartment(session.user, departmentId, getUserDepartmentIds(session.user))) {
    return NextResponse.json({ error: 'No access to this department' }, { status: 403 });
  }

  // ✓ Safe: Fetch marks for exam in department
  const marks = await prisma.marks.findMany({
    where: {
      schoolId: session.user.schoolId,
      exam: {
        departmentId, // ← Department filter
      },
    },
  });

  return NextResponse.json(marks);
}
```

### PATCH /api/marks/[id]/approve - Approve marks (HOD only)

```typescript
export async function PATCH(req, { params }) {
  const session = await getAppSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const marks = await prisma.marks.findUnique({
    where: { id: params.id },
    include: { exam: true },
  });

  if (!marks) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // LAYER 2: Permission check (HOD.marks.approve)
  if (!userHasPermissionWithDepartment(session.user, 'marks.approve', marks.exam.departmentId)) {
    return NextResponse.json(
      { error: 'No permission to approve marks' },
      { status: 403 }
    );
  }

  // LAYER 3: Approve only if HOD of that department
  if (!canAccessDepartment(session.user, marks.exam.departmentId, getUserDepartmentIds(session.user))) {
    return NextResponse.json(
      { error: 'Cannot approve marks outside your department' },
      { status: 403 }
    );
  }

  // ✓ Safe: Approve
  const approved = await prisma.marks.update({
    where: { id: params.id },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedBy: session.user.id,
    },
  });

  return NextResponse.json(approved);
}
```

---

## Pattern 4: Admin Operations (Unrestricted, Logs Required)

### POST /api/departments/[id]/assign-hod - Assign HOD to department

```typescript
import { logRBACAction } from '@/lib/rbac/logging';

export async function POST(req, { params }) {
  const session = await getAppSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId } = await req.json();

  // LAYER 1+2: Only ADMIN can assign HODs
  if (!userHasSystemRole(session.user, 'ADMIN') && 
      !userHasSystemRole(session.user, 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Only admins can assign HODs' }, { status: 403 });
  }

  // ✓ ADMIN can assign HOD (no department restriction)
  const updated = await prisma.department.update({
    where: { id: params.id },
    data: { headId: userId },
  });

  // Log the action
  await logRBACAction({
    schoolId: session.user.schoolId,
    actorId: session.user.id,
    action: 'HOD_ASSIGNED',
    targetType: 'department',
    targetId: params.id,
    metadata: {
      hodUserId: userId,
      departmentId: params.id,
    },
  });

  return NextResponse.json(updated);
}
```

---

## Common Anti-Patterns ❌

### Anti-Pattern 1: No Department Check
```typescript
// ❌ WRONG - No department validation
export async function PATCH(req, { params }) {
  const session = await getAppSession();
  if (!userHasPermission(session.user, 'exams.edit')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Vulnerable: HOD can edit exams from other departments!
}
```

### Anti-Pattern 2: Frontend-Only Validation
```typescript
// ❌ WRONG - Only frontend validation
// Frontend: Check userRole === 'HOD' before showing button
// Backend: No check! (Attacker can POST directly)
export async function PATCH(req, { params }) {
  const data = await req.json();
  // Vulnerable: Anyone can hit this endpoint!
  return NextResponse.json(await prisma.exam.update(...));
}
```

### Anti-Pattern 3: Trusting Client-Provided departmentId
```typescript
// ❌ WRONG - Trusting client input
export async function GET(req) {
  const session = await getAppSession();
  const { departmentId } = await req.json(); // ← Client provides!

  // Vulnerable: Client can request any department
  const exams = await prisma.exam.findMany({
    where: { departmentId }, // ← No server validation!
  });
}
```

### Anti-Pattern 4: OR Instead of AND
```typescript
// ❌ WRONG - OR logic (should be AND)
if (userHasPermission(user, 'exams.view') ||
    userHasPermission(user, 'exams.edit')) {
  // Grants both if either true (too permissive)
}

// ✓ RIGHT - AND logic
if (!userHasPermission(user, 'exams.view') &&
    !userHasPermission(user, 'exams.edit')) {
  return denied;
}
```

---

## Testing Each Pattern

### Unit Test Template
```typescript
describe('PATCH /api/exams/[id]', () => {
  it('should allow HOD to update their department exam', async () => {
    const mathHOD = await createUser({ role: 'HOD', departmentId: 'math' });
    const exam = await createExam({ departmentId: 'math' });

    const res = await PATCH({ user: mathHOD }, { params: { id: exam.id } });
    expect(res.status).toBe(200);
  });

  it('should deny HOD from updating other department exam', async () => {
    const mathHOD = await createUser({ role: 'HOD', departmentId: 'math' });
    const exam = await createExam({ departmentId: 'physics' });

    const res = await PATCH({ user: mathHOD }, { params: { id: exam.id } });
    expect(res.status).toBe(403);
    expect(res.body).toContain('No access to this department');
  });

  it('should allow ADMIN to update any exam', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const exam = await createExam({ departmentId: 'physics' });

    const res = await PATCH({ user: admin }, { params: { id: exam.id } });
    expect(res.status).toBe(200);
  });
});
```

---

## Checklist for Phase 3 Implementation

For each API endpoint:

- [ ] **Layer 1**: `getAppSession()` validates user exists
- [ ] **Layer 2**: `userHasPermissionWithDepartment()` checks permission + department
- [ ] **Layer 3**: `canAccessDepartment()` or `canManageFacultyInDepartment()` validates access
- [ ] **Error responses**: Include department context in 403 errors
- [ ] **Logging**: `logRBACAction()` tracks the operation
- [ ] **No frontend fallback**: Backend check is NOT optional
- [ ] **Tests**: Unit tests for all three layers

---

## Security Reminders

1. **Every endpoint is an attack surface** - Treat all public API routes as hostile
2. **UI is cosmetic** - Sidebar buttons are for UX, not security
3. **Always validate on server** - Never trust client-provided IDs
4. **Department context matters** - HOD isolation requires strict checks
5. **Log everything** - Failed access attempts must be logged
6. **Test the exploit** - Try to access data you shouldn't have

---

## Questions?

- **Q**: What if user has multiple departments?  
  **A**: `canAccessDepartment()` checks if requested department is in user's list.

- **Q**: What if departmentId is not in request?  
  **A**: Return 400 Bad Request or use sensible default (user's primary dept for Faculty).

- **Q**: Can we cache permissions?  
  **A**: Yes, but cache invalidation must trigger on role/department changes.

- **Q**: What about cross-department reporting?  
  **A**: Allowed for ADMIN/SUPER_ADMIN without department check. Allowed for HOD across their departments.

**Status**: Ready for Phase 3 implementation ✅
