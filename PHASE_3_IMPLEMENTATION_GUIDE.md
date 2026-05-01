# Phase 3: Middleware & Route Protection - Implementation Guide

## Overview

Phase 3 adds security middleware, permission guards, and route protection to your RBAC system. This ensures:
- ✅ Every API route validates permissions server-side
- ✅ UI hides unauthorized elements
- ✅ Pages redirect if user lacks access
- ✅ Unauthorized attempts are logged

---

## What's New (Phase 3 Files)

### 1. `src/lib/rbac/middleware.ts` (450+ lines)
Middleware functions for protecting API routes.

**Functions**:
- `withPermission(permission, handler)` - Require single permission
- `withPermissions(permissions[], handler)` - Require ALL permissions
- `withAnyPermission(permissions[], handler)` - Require ANY permission
- `withRole(roleId, handler)` - Require specific role
- `withSuperAdmin(handler)` - Require Super Admin role
- `checkPermissionMiddleware()` - Check permission return result
- `logUnauthorizedAccess()` - Log denied access attempts

**Returns**: NextResponse with 200 (allowed), 401 (not auth), 403 (forbidden), 500 (error)

### 2. `src/components/permission-guard.tsx` (400+ lines)
React components for conditional rendering based on permissions.

**Components**:
- `<PermissionGuard>` - Show/hide based on permission
- `<RoleGuard>` - Show/hide based on role
- `<FeatureGuard>` - Show/hide based on custom feature
- `<SensitiveOperation>` - Wrapper for operations needing confirmation
- `<ConditionalRender>` - Generic conditional render with custom check

### 3. `src/components/route-protected.tsx` (350+ lines)
Wrappers for protecting full pages and routes.

**Exports**:
- `withProtectedRoute(Component, options)` - HOC for page protection
- `<ProtectedPageWrapper>` - Component wrapper
- `useAuthorization(options)` - Hook for custom authorization checks

### 4. `prisma/seed-rbac.ts` (200+ lines)
Seed script to populate system roles and permissions.

**Does**:
- Creates 4 system roles (Super Admin, Admin, Academic Head, Teacher)
- Creates 60+ permissions
- Maps permissions to each system role
- Verifies all data created correctly

**Usage**: `pnpm exec ts-node prisma/seed-rbac.ts`

### 5. `src/lib/rbac/menu-integration.ts` (250+ lines)
Guide and utilities for integrating RBAC into your admin navigation.

**Exports**:
- `ADMIN_MENU_ITEMS[]` - Example menu with required permissions
- `<AdminSidebar>` - Example sidebar component
- `<UserMenu>` - Example user dropdown menu
- `useVisibleMenuItems(user)` - Hook to filter visible items
- `MENU_GROUPS` - Grouped menu structure

---

## Implementation Steps

### Step 1: Seed System Roles & Permissions

```bash
# Run seed script
pnpm exec ts-node prisma/seed-rbac.ts
```

**What it does**:
- Creates 4 system roles in database
- Creates 60+ permissions
- Maps permissions to roles
- Verifies data integrity

**Output**:
```
✅ Total permissions: 60
✅ Total roles: 4
✅ Total role-permission mappings: 150+

System Roles Created:
  - Super Admin (Global)
  - Admin (Global)
  - Academic Head (Global)
  - Teacher (Global)
```

### Step 2: Protect API Routes with Middleware

**Before**:
```typescript
// src/app/api/rbac/roles/route.ts
export async function GET(request: NextRequest) {
  const session = await getAppSession();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Get roles
  const roles = await prisma.role.findMany({
    where: { schoolId: session.user.schoolId },
  });
  
  return NextResponse.json(roles);
}
```

**After** (with middleware):
```typescript
import { withPermission } from '@/lib/rbac/middleware';

export const GET = withPermission('roles.view', async (request) => {
  const session = await getAppSession();
  
  // Permission already checked! Just get data
  const roles = await prisma.role.findMany({
    where: { schoolId: session.user.schoolId },
  });
  
  return NextResponse.json(roles);
});
```

**Options for API protection**:
```typescript
// Single permission required
export const GET = withPermission('users.view', handler);

// Multiple permissions required (all)
export const DELETE = withPermissions(['users.delete', 'logs.write'], handler);

// Any permission (at least one)
export const POST = withAnyPermission(['admin.publish', 'teacher.publish'], handler);

// Specific role required
export const GET = withRole(superAdminRoleId, handler);

// Super Admin only
export const DELETE = withSuperAdmin(handler);
```

### Step 3: Add Permission Guards to UI Components

**Before** (no guards):
```typescript
// User can click delete button even without permission
export function UserTable({ users }) {
  return (
    <table>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>{user.name}</td>
            <td>
              <button onClick={() => deleteUser(user.id)}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

**After** (with guards):
```typescript
import { PermissionGuard } from '@/components/permission-guard';

export function UserTable({ users, user }) {
  return (
    <table>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>{user.name}</td>
            <td>
              <PermissionGuard
                user={user}
                permission="users.delete"
                fallback={<span className="text-gray-400">No permission</span>}
              >
                <button onClick={() => deleteUser(user.id)}>
                  Delete
                </button>
              </PermissionGuard>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

**All guard types**:
```typescript
// Single permission
<PermissionGuard user={user} permission="users.delete">
  <DeleteButton />
</PermissionGuard>

// Multiple permissions (all required)
<PermissionGuard user={user} permissions={['users.create', 'users.edit']}>
  <CreateUserForm />
</PermissionGuard>

// Any permission
<PermissionGuard user={user} anyPermission={['admin.view', 'teacher.view']}>
  <ReportSection />
</PermissionGuard>

// Role-based
<RoleGuard user={user} roleIds={[adminRoleId]}>
  <AdminPanel />
</RoleGuard>

// Custom features
<FeatureGuard user={user} featureKey="attendance.correction">
  <AttendanceCorrectionPanel />
</FeatureGuard>

// Sensitive operations (need confirmation)
<SensitiveOperation
  user={user}
  permission="users.delete"
  confirmPrompt="Delete this user? Cannot be undone."
  onConfirm={handleDelete}
>
  <button>Delete User</button>
</SensitiveOperation>
```

### Step 4: Protect Pages with Route Protection

**Option A: Use HOC**:
```typescript
import { withProtectedRoute } from '@/components/route-protected';

function RolesPage({ user }) {
  return <RolesList />;
}

export default withProtectedRoute(RolesPage, {
  requiredPermission: 'roles.view',
  redirectTo: '/unauthorized',
});
```

**Option B: Use Wrapper Component**:
```typescript
import { ProtectedPageWrapper } from '@/components/route-protected';

export default function RolesPage({ user }) {
  return (
    <ProtectedPageWrapper
      title="Roles & Permissions"
      user={user}
      requiredPermission="roles.view"
    >
      <RolesList />
    </ProtectedPageWrapper>
  );
}
```

**Option C: Use Hook**:
```typescript
import { useAuthorization } from '@/components/route-protected';

export default function RolesPage({ user }) {
  const { isAuthorized } = useAuthorization({
    requiredPermission: 'roles.view',
  });

  if (!isAuthorized) {
    return <div>Not authorized</div>;
  }

  return <RolesList />;
}
```

### Step 5: Update Admin Sidebar/Navigation

**Update `src/components/app-shell.tsx`**:

```typescript
import { PermissionGuard } from '@/components/permission-guard';
import { ADMIN_MENU_ITEMS } from '@/lib/rbac/menu-integration';

export function AdminSidebar({ user }) {
  return (
    <nav>
      {ADMIN_MENU_ITEMS.map((item) => (
        <PermissionGuard
          key={item.href}
          user={user}
          permission={item.requiredPermission || undefined}
          silent={!item.requiredPermission}
        >
          <Link href={item.href}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        </PermissionGuard>
      ))}
    </nav>
  );
}
```

**What happens**:
- "Users" menu item only shows if user has `users.view` permission
- "Roles & Permissions" only shows if user has `roles.view` permission
- Dashboard always shows (no permission required)
- Other items hide silently for users without permission

---

## Usage Examples

### Protect a Delete Operation

```typescript
// Component
<SensitiveOperation
  user={user}
  permission="users.delete"
  confirmPrompt="Are you sure? This cannot be undone."
  onConfirm={() => handleDelete()}
>
  <Button variant="destructive">Delete User</Button>
</SensitiveOperation>

// API Route
import { withPermission } from '@/lib/rbac/middleware';

export const DELETE = withPermission('users.delete', async (request) => {
  const id = request.url.split('/').pop();
  
  await prisma.user.delete({
    where: { id },
  });
  
  return NextResponse.json({ success: true });
});
```

### Show Admin Section Only to Admins

```typescript
<PermissionGuard
  user={user}
  anyPermission={['roles.view', 'users.view', 'settings.view']}
  fallback={<p>You don't have admin access</p>}
>
  <AdminPanel />
</PermissionGuard>
```

### Require Multiple Permissions

```typescript
// User must have BOTH permissions
<PermissionGuard
  user={user}
  permissions={['marks.approve', 'reports.export']}
  fallback={<p>Missing required permissions</p>}
>
  <ApproveAndExportButton />
</PermissionGuard>

// API - same thing
export const POST = withPermissions(
  ['marks.approve', 'reports.export'],
  async (request) => {
    // Approve and export...
  }
);
```

### Custom Feature Access

```typescript
// Show attendance correction feature (only if assigned)
<FeatureGuard
  user={user}
  featureKey="attendance.correction"
  fallback={<p>No access to attendance correction</p>}
>
  <AttendanceCorrectionPanel />
</FeatureGuard>
```

---

## Testing the Implementation

### Test 1: Login as Different Roles

1. Login as Super Admin
   ```
   Email: principal@school.in
   Password: password123
   ```
   ✅ Should see all menu items
   ✅ Should access all pages

2. Login as Admin
   ✅ Should see user management, settings
   ❌ Should NOT see super admin features

3. Login as Teacher
   ✅ Should see only class/marks features
   ❌ Should NOT see admin pages

### Test 2: Test Permission Denial

```bash
# Try to delete user without permission
curl -X DELETE http://localhost:3000/api/users/123 \
  -H "Authorization: Bearer ${TEACHER_TOKEN}"

# Expected: 403 Forbidden
# {
#   "error": "Missing permission: users.delete"
# }
```

### Test 3: Check Audit Logs

```bash
# Login to Prisma Studio
pnpm db:studio

# Check RBACLog table
# You should see entries like:
# - action: "PERMISSION_DENIED"
# - permission: "users.delete"
# - actorId: teacher_user_id
# - ipAddress: request_ip
```

---

## Common Patterns

### Pattern 1: Admin-Only Feature

```typescript
<PermissionGuard user={user} permission="settings.edit">
  <SettingsPanel />
</PermissionGuard>
```

### Pattern 2: Edit Permission Different from View

```typescript
export default function UserPage({ user, userId }) {
  return (
    <ProtectedPageWrapper
      user={user}
      requiredPermission="users.view"
    >
      <UserDetail userId={userId} user={user} />
    </ProtectedPageWrapper>
  );
}

// In UserDetail component
<PermissionGuard user={user} permission="users.edit" silent>
  <EditButton />
</PermissionGuard>
```

### Pattern 3: Multiple Permission Levels

```typescript
// View: everyone with basic permission
// Edit: additional permission required
// Delete: sensitive operation

<div>
  <PermissionGuard user={user} permission="users.view">
    <UserData />
  </PermissionGuard>
  
  <PermissionGuard user={user} permission="users.edit">
    <EditButton />
  </PermissionGuard>
  
  <SensitiveOperation
    user={user}
    permission="users.delete"
    confirmPrompt="Delete user?"
  >
    <DeleteButton />
  </SensitiveOperation>
</div>
```

---

## Troubleshooting

### Issue: Menu item not showing

**Causes**:
- User doesn't have required permission
- Permission key is wrong
- User's roles don't have that permission

**Debug**:
```bash
# Check user's permissions
pnpm db:studio
# Query: SELECT * FROM RoleAssignment WHERE userId = 'user_id'
# Then check that role's permissions

# Or in code:
import { checkPermissionDetailed } from '@/lib/rbac/utils';
const result = checkPermissionDetailed(user, 'users.view');
console.log(result);
// { allowed: false, by: null, reason: 'No roles with this permission' }
```

### Issue: API returns 403

**Causes**:
- User not authenticated
- Permission denied
- Session expired

**Check**:
```typescript
// Add logging to middleware
export const GET = withPermission('users.view', async (request) => {
  console.log('User accessing GET /api/users');
  // If you see this, permission check passed
  return NextResponse.json(users);
});
```

### Issue: Component guard always shows fallback

**Causes**:
- User prop is null/undefined
- Permission key is wrong
- User doesn't have permission

**Debug**:
```typescript
<PermissionGuard
  user={user}
  permission="users.view"
  fallback={
    <div>
      Debug: user={user ? 'OK' : 'NULL'}
      {user && (
        <div>
          Roles: {user.roles?.map(r => r.roleId).join(', ')}
        </div>
      )}
    </div>
  }
>
  Content
</PermissionGuard>
```

---

## Next Steps

1. ✅ Run `pnpm exec ts-node prisma/seed-rbac.ts` to populate system roles
2. ✅ Update API routes with middleware wrappers
3. ✅ Add permission guards to components
4. ✅ Protect pages with route protection
5. ✅ Update admin sidebar to show/hide items
6. 📋 Test with different user roles
7. 📋 Add integration tests (Phase 4)
8. 📋 Add E2E tests (Phase 4)

---

## Summary

You now have:
- ✅ Middleware for API route protection
- ✅ React components for UI guards
- ✅ Route protection HOCs
- ✅ Seed script for system roles
- ✅ Menu integration examples
- ✅ Comprehensive error handling
- ✅ Unauthorized attempt logging

**Status**: Phase 3 COMPLETE
**What's next**: Phase 4 (Integration testing + seed scripts) or Phase 5 (Advanced features)

For questions, see:
- RBAC_IMPLEMENTATION_ROADMAP.md
- RBAC_QUICK_START.md
- RBAC_ARCHITECTURE.md
