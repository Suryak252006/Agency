# Phase 3: Middleware & Route Protection - Integration Checklist

**Status**: Ready for Implementation  
**Estimated Duration**: 4-6 hours  
**Priority**: Critical - Security layer for all API endpoints

---

## 📋 Pre-Implementation Checklist

Before starting Phase 3 implementation, verify Phase 2 is complete:

- [x] Department model created with HOD assignments
- [x] FacultyDepartment junction table for multi-dept support
- [x] RoleAssignment includes optional departmentId
- [x] Database migrated successfully
- [x] Seed data includes multi-department setup
- [x] Backend middleware decorators created (`withContext`, `withPermissionAndDepartment`, etc.)
- [x] Menu visibility engine implemented (`menu-visibility.ts`)
- [x] Security test suite created (`SECURITY_TESTS.test.ts`)
- [x] Implementation examples provided (`PHASE_3_EXAMPLES.ts`)

---

## 🎯 Implementation Phases

### Phase 3A: Middleware Implementation (1-2 hours)

Implement middleware decorators in all API routes.

#### Step 1: Core Role Management APIs
Files to update:
- [ ] `src/app/api/rbac/roles/route.ts` - GET/POST roles
- [ ] `src/app/api/rbac/roles/[id]/route.ts` - GET/PUT/DELETE role
- [ ] `src/app/api/rbac/permissions/route.ts` - GET permissions
- [ ] `src/app/api/rbac/custom-features/route.ts` - Custom features CRUD

**Pattern**: All ADMIN-only routes
```typescript
import { withAdmin, Middleware } from '@/lib/rbac/middleware';

export const GET = withAdmin(async (request, context) => {
  // Implementation
  return Middleware.sendSuccess(data);
});
```

#### Step 2: Department-Scoped APIs
Files to update:
- [ ] `src/app/api/exams/route.ts` - GET exams (multi-dept filter)
- [ ] `src/app/api/exams/[id]/route.ts` - GET/PUT exam
- [ ] `src/app/api/classes/route.ts` - GET classes (multi-dept filter)
- [ ] `src/app/api/marks/route.ts` - GET marks (multi-dept filter)
- [ ] `src/app/api/marks/[id]/approve/route.ts` - HOD approval

**Pattern**: Department-scoped with permission check
```typescript
import { withPermissionDepartmentScope, Middleware } from '@/lib/rbac/middleware';

export const GET = withPermissionDepartmentScope(
  'resource.view',
  async (request, context) => {
    // Layer 3: Check data ownership
    // Layer 4: Filter by user's departments
    return Middleware.sendSuccess(data);
  }
);
```

#### Step 3: User Management APIs
Files to update:
- [ ] `src/app/api/users/[id]/route.ts` - GET/PUT user
- [ ] `src/app/api/users/[id]/assign-role/route.ts` - Assign roles
- [ ] `src/app/api/users/[id]/assign-department/route.ts` - Assign departments

**Pattern**: Privilege escalation prevention
```typescript
import { withContext, checkCanModifyUser, Middleware } from '@/lib/rbac/middleware';

export const POST = withContext(async (request, context) => {
  const userId = request.nextUrl.pathname.split('/')[3];
  const targetUser = await getTargetUser(userId);
  
  // Check hierarchy
  const check = await checkCanModifyUser(context, userId, getUserRoleHierarchy(targetUser));
  if (!check.allowed) {
    return Middleware.sendError(check.reason, check.status);
  }
  
  // Implementation
  return Middleware.sendSuccess(result);
});
```

#### Step 4: Faculty Management APIs
Files to update:
- [ ] `src/app/api/faculty/route.ts` - GET faculty (HOD sees own dept only)
- [ ] `src/app/api/faculty/[id]/route.ts` - GET/PUT faculty
- [ ] `src/app/api/faculty/[id]/assign-department/route.ts` - Assign to dept

**Pattern**: HOD isolation + multi-department support
```typescript
import { withContext, Middleware, checkCanManageFaculty } from '@/lib/rbac/middleware';
import { userHasSystemRole, getUserDepartmentIds } from '@/lib/rbac/utils';

export const GET = withContext(async (request, context) => {
  if (!userHasPermission(context.user, 'faculty.view')) {
    return Middleware.sendError('Permission denied', 403);
  }

  const query = buildQuery(context.user);
  // For HOD: only their departments
  // For ADMIN: all
  // For FACULTY: cannot view
  
  const faculty = await prisma.user.findMany(query);
  return Middleware.sendSuccess(faculty);
});
```

---

### Phase 3B: Frontend Route Protection (1-2 hours)

Implement frontend permission guards and menu visibility.

#### Step 1: Update Permission Guard Component
File: `src/components/permission-guard.tsx`

**Current**: Basic permission checking
**Update**: Add department context

```typescript
interface PermissionGuardProps {
  permission: string | string[];
  departmentId?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({
  permission,
  departmentId,
  fallback,
  children,
}: PermissionGuardProps) {
  const { user } = useSession();
  
  if (!user) return fallback;
  
  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasAll = permissions.every(p =>
    userHasPermissionWithDepartment(user, p, departmentId)
  );
  
  if (!hasAll) return fallback;
  if (departmentId && !canAccessDepartment(user, departmentId, getUserDepartmentIds(user))) {
    return fallback;
  }
  
  return <>{children}</>;
}
```

#### Step 2: Update Route Protection HOC
File: `src/components/route-protected.tsx`

**Update**: Add department validation

```typescript
export function withProtectedRoute(
  requiredPermission: string,
  options?: { requireDepartment?: boolean }
) {
  return (Component: any) => {
    return function Protected(props: any) {
      const { user } = useSession();
      const router = useRouter();
      const [departmentId] = useSearchParams().get('departmentId') || [];
      
      if (!user) {
        router.push('/auth/login');
        return null;
      }
      
      // Check permission
      if (!userHasPermission(user, requiredPermission)) {
        router.push('/unauthorized');
        return null;
      }
      
      // Check department if required
      if (options?.requireDepartment) {
        const userDepts = getUserDepartmentIds(user);
        if (userDepts.length === 0) {
          return <NoDeptsError />;
        }
        
        if (departmentId && !canAccessDepartment(user, departmentId, userDepts)) {
          return <NoAccessError />;
        }
      }
      
      return <Component {...props} />;
    };
  };
}
```

#### Step 3: Update Sidebar Component
File: `src/components/app-shell.tsx` (or sidebar component)

**Update**: Use menu visibility engine

```typescript
import { getMenuForUser, filterActions, MARK_ACTIONS } from '@/lib/rbac/menu-visibility';

export function Sidebar() {
  const { user } = useSession();
  const [departmentId, setDepartmentId] = useState<string>();
  
  if (!user) return null;
  
  const menuItems = getMenuForUser(user, departmentId);
  const actions = filterActions(MARK_ACTIONS, user, departmentId);
  
  return (
    <nav className="sidebar">
      <DepartmentSelector 
        user={user}
        selected={departmentId}
        onChange={setDepartmentId}
      />
      
      <MenuTree items={menuItems} />
      
      <ActionBar>
        {actions.map(action => (
          <ActionButton 
            key={action.id}
            {...action}
            disabled={!action.isEnabled}
          />
        ))}
      </ActionBar>
    </nav>
  );
}
```

#### Step 4: Update Action Buttons
Update all action buttons to use permission guards.

Example patterns:
```typescript
// Inline permission check
{user && canEdit(user, 'exams') && (
  <EditButton onClick={handleEdit} />
)}

// Using PermissionGuard component
<PermissionGuard permission="marks.approve" departmentId={deptId}>
  <ApproveButton onClick={handleApprove} />
</PermissionGuard>

// Using menu visibility
{filterActions(EXAM_ACTIONS, user, deptId).map(action => (
  <button key={action.id} {...action}>
    {action.label}
  </button>
))}
```

---

### Phase 3C: Testing & Validation (1-2 hours)

#### Step 1: Run Security Tests
```bash
# Run privilege escalation tests
pnpm test:security SECURITY_TESTS.test.ts

# Verify HOD isolation
pnpm test:unit -- --testNamePattern="Department Scope"

# Verify system role checks
pnpm test:unit -- --testNamePattern="System Role"
```

#### Step 2: Manual Testing Scenarios

**Scenario 1: HOD Department Isolation**
```
Setup:
- Create 2 departments: Math, Physics
- Create 2 HODs: HOD-Math, HOD-Physics
- Create 3 exams: Math Exam, Physics Exam, Cross-Dept Exam

Test:
1. Login as HOD-Math
2. Visit /admin/exams
   ✓ Should see only Math Exam
   ✗ Should NOT see Physics Exam
   
3. Try direct URL: /api/exams?examId=physics-exam-id
   ✓ Should return 403 "No access to department"
```

**Scenario 2: Faculty Multi-Department Access**
```
Setup:
- Faculty assigned to Math AND Physics departments
- Create exams in both departments

Test:
1. Login as Faculty
2. Visit /faculty/exams
   ✓ Should see exams from BOTH departments
3. Try to create exam
   ✗ Should NOT be able to (no permission)
```

**Scenario 3: HOD Cannot Approve Outside Dept**
```
Setup:
- HOD-Math tries to approve mark from Physics exam
- Mark belongs to Physics exam, Physics department

Test:
1. POST /api/marks/{mark-id}/approve
   Request body: { status: 'APPROVED' }
   ✓ Should return 403 "Cannot approve marks outside your department"
```

**Scenario 4: ADMIN Unrestricted Access**
```
Setup:
- Admin user with ADMIN system role
- Try to access all departments and users

Test:
1. GET /api/exams?limit=1000
   ✓ Should return exams from ALL departments
2. GET /api/users
   ✓ Should return ALL users
3. POST /api/users/{user-id}/assign-role
   ✓ Should work with any user and role
```

**Scenario 5: Privilege Escalation Prevention**
```
Setup:
- HOD tries to assign ADMIN role to another user
- Faculty tries to assign HOD role to self

Test:
1. HOD POST /api/users/{user-id}/assign-role
   Request: { roleId: 'admin-role-id' }
   ✓ Should return 403 "Cannot manage user with equal or higher privilege"

2. Faculty POST /api/users/{self-id}/assign-role
   Request: { roleId: 'hod-role-id' }
   ✓ Should return 401 "Unauthorized"
```

#### Step 3: API Integration Tests
```bash
# Test with API client
pnpm test:integration

# Test specific route
pnpm test:integration -- --testNamePattern="marks-approval"

# Test privilege escalation scenarios
pnpm test:security
```

---

## 📝 Implementation Checklist by Route

### MUST IMPLEMENT (Security Critical)

- [ ] **GET /api/exams** - Filter by user departments
- [ ] **POST /api/exams** - Require permission + department
- [ ] **PATCH /api/marks/[id]/approve** - HOD only + dept check
- [ ] **POST /api/users/[id]/assign-role** - Privilege escalation check
- [ ] **POST /api/faculty/[id]/assign-department** - HOD overlap check
- [ ] **GET /api/faculty** - HOD sees own dept only
- [ ] **GET /api/classes** - Filter by departments
- [ ] **GET /api/students** - Filter appropriately

### SHOULD IMPLEMENT (High Priority)

- [ ] **GET /api/marks** - Filter by departments
- [ ] **GET /api/requests** - Filter by departments
- [ ] **POST /api/exams/[id]** - Department validation
- [ ] **GET /api/reports** - Department-scoped data
- [ ] **POST /api/custom-features/assign** - Admin only
- [ ] **GET /api/rbac/roles** - Admin only
- [ ] **POST /api/rbac/roles** - Admin + hierarchy check

### NICE TO HAVE (Lower Priority)

- [ ] **GET /api/admin/statistics** - Admin only
- [ ] **GET /api/admin/logs** - Admin with audit trail
- [ ] **POST /api/settings** - Admin only
- [ ] **GET /api/health** - Public or any auth

---

## 🔄 Middleware Decorator Reference

### Authentication Only
```typescript
export const GET = withContext(async (request, context) => {
  // Has context.user, context.schoolId, context.departmentId
});
```

### With Permission
```typescript
export const GET = withPermission('exams.view', async (request) => {
  // User has 'exams.view' permission
});
```

### With Permission + Department
```typescript
export const GET = withPermissionAndDepartment(
  'exams.edit',
  async (request, context) => {
    // User has 'exams.edit' + can access departmentId
  }
);
```

### Advanced: Permission + Department + Data Ownership
```typescript
export const PATCH = withPermissionDepartmentScope(
  'marks.approve',
  async (request, context) => {
    // Layers 1-2 auto-checked
    // Layer 3: Check data ownership in handler
    
    const mark = await prisma.marks.findUnique({...});
    if (mark.exam.departmentId !== context.departmentId) {
      return Middleware.sendError('Department mismatch', 403);
    }
    
    // Proceed with update
  }
);
```

### System Role Requirements
```typescript
export const DELETE = withSystemRole('ADMIN', 'SUPER_ADMIN')(
  async (request, context) => {
    // Only ADMIN or SUPER_ADMIN can access
  }
);
```

### Department Scope Only
```typescript
export const GET = withDepartmentScope(async (request, context) => {
  // Requires valid departmentId in query or path
  // Validates user can access that department
});
```

---

## 🚨 Common Pitfalls to Avoid

### ❌ Pitfall 1: Missing Department Context
```typescript
// WRONG: No department filtering
const exams = await prisma.exam.findMany({
  where: { schoolId },
});

// CORRECT: Filter by user's departments
const exams = await prisma.exam.findMany({
  where: {
    schoolId,
    departmentId: { in: userDepartmentIds },
  },
});
```

### ❌ Pitfall 2: Checking Permission Without Department
```typescript
// WRONG: Only checks permission, not department
if (userHasPermission(user, 'marks.approve')) {
  // Update marks (could be cross-department!)
}

// CORRECT: Check permission + department
if (userHasPermissionWithDepartment(user, 'marks.approve', mark.departmentId)) {
  // Safe to update
}
```

### ❌ Pitfall 3: Frontend-Only Permission Checks
```typescript
// WRONG: Frontend hides button but API has no check
{canApprove && <Button onClick={approve} />}

// CORRECT: Frontend AND backend check
{canApprove && <Button onClick={approve} />}
// AND in API route:
if (!userHasPermission(user, 'marks.approve')) {
  return Middleware.sendError('Permission denied', 403);
}
```

### ❌ Pitfall 4: Trusting User Input for Department
```typescript
// WRONG: Using user-supplied departmentId
const deptId = request.nextUrl.searchParams.get('departmentId');
if (deptId) {
  const data = await getDataForDept(deptId); // Could access any dept!
}

// CORRECT: Validate user can access the department
const deptId = request.nextUrl.searchParams.get('departmentId');
const userDepts = getUserDepartmentIds(user);
if (deptId && !userDepts.includes(deptId)) {
  return Middleware.sendError('Department access denied', 403);
}
```

### ❌ Pitfall 5: Allowing Role Escalation
```typescript
// WRONG: No hierarchy check
const role = await prisma.role.findUnique({where: {id: roleId}});
await prisma.roleAssignment.create({
  data: {userId, roleId, schoolId}
});

// CORRECT: Prevent escalation
const targetHierarchy = getUserRoleHierarchy(targetUser);
const actorHierarchy = getUserRoleHierarchy(actor);
if (actorHierarchy <= targetHierarchy) {
  return Middleware.sendError('Cannot assign equal or higher role', 403);
}
```

---

## 📊 Testing Metrics

After implementation, verify:

- [ ] All API routes return 401 for unauthenticated requests
- [ ] All sensitive routes return 403 for unauthorized users
- [ ] HOD cannot access other departments (0% cross-dept leakage)
- [ ] Faculty cannot approve marks (0% privilege escalation)
- [ ] Department filtering works for all list endpoints
- [ ] Frontend buttons respect backend permissions
- [ ] Menu items reflect actual user permissions
- [ ] Audit logs capture all permission denials
- [ ] No SQL injection in filtered queries
- [ ] Response times < 500ms for permission checks

---

## 🔒 Security Audit Checklist

Before moving to production:

- [ ] All API endpoints have middleware protection
- [ ] Department scope validated on every cross-dept operation
- [ ] Privilege escalation tests all pass
- [ ] User cannot modify their own permissions
- [ ] User cannot assign roles higher than their own
- [ ] Audit logs capture all permission denials
- [ ] All sensitive data filtered by school + department
- [ ] No sensitive data in error messages (no "user not found" differences)
- [ ] Rate limiting on permission-denied requests
- [ ] CORS properly configured for frontend

---

## 📞 Troubleshooting

### Issue: "Permission denied" on valid operation
**Diagnosis**:
1. Check user has permission in ROLE_PERMISSION_MAP
2. Check user's roles are loaded with permissions
3. Verify departmentId is correct
4. Check permissions include required permission

**Fix**:
```typescript
// Debug: Log what's being checked
console.log('User roles:', user.roles);
console.log('User perms:', user.permissions);
console.log('User depts:', getUserDepartmentIds(user));
console.log('Checking for:', 'resource.action');
```

### Issue: HOD can see other departments
**Diagnosis**:
1. Missing department filter in query
2. Role assignment missing departmentId
3. Seed data incomplete

**Fix**:
```typescript
// Verify department assignment
const hod = await prisma.user.findUnique({
  where: { id: hodId },
  include: { roles: { include: { role: true } } }
});
console.log('HOD roles:', hod.roles);
// Should show departmentId on role assignment
```

### Issue: Frontend button showing when it shouldn't
**Diagnosis**:
1. Using old permission check (without department)
2. Permission guard missing departmentId prop
3. Stale user data in session

**Fix**:
```typescript
// Use correct permission check with department
<PermissionGuard
  permission="marks.approve"
  departmentId={departmentId}
>
  <ApproveButton />
</PermissionGuard>
```

---

## 📚 References

- **Middleware Guide**: `src/lib/rbac/middleware.ts` (250+ lines)
- **Menu Visibility**: `src/lib/rbac/menu-visibility.ts` (300+ lines)
- **Examples**: `src/lib/rbac/PHASE_3_EXAMPLES.ts` (commented code examples)
- **Security Tests**: `src/lib/rbac/SECURITY_TESTS.test.ts` (integration tests)
- **Phase 3 Architecture**: `RBAC_CORRECTIONS_COMPLETE.md` section 8

---

## ✅ Sign-off

Implementation complete when:

- [x] All API routes have middleware protection
- [x] Department filtering works on all list endpoints
- [x] Permission guards prevent privilege escalation
- [x] Frontend respects backend permissions
- [x] Security tests all pass
- [x] Manual scenarios validated
- [x] No permission denials for valid operations
- [x] Audit logs capture all access attempts

---

**Expected Completion**: Phase 3 ready for staging environment testing  
**Next Steps**: Phase 4 (Optional) - Advanced features (temporal access, delegation, etc.)
