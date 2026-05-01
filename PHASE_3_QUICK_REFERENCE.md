# Phase 3: Quick Reference Card

## API Middleware (Protecting Routes)

### Single Permission Required
```typescript
import { withPermission } from '@/lib/rbac/middleware';

export const GET = withPermission('users.view', async (request) => {
  // User has users.view permission
  return NextResponse.json(users);
});
```

### All Permissions Required (AND logic)
```typescript
import { withPermissions } from '@/lib/rbac/middleware';

export const DELETE = withPermissions(
  ['users.delete', 'logs.write'],
  async (request) => {
    // User must have BOTH permissions
    return NextResponse.json({ success: true });
  }
);
```

### Any Permission (OR logic)
```typescript
import { withAnyPermission } from '@/lib/rbac/middleware';

export const POST = withAnyPermission(
  ['admin.publish', 'teacher.publish'],
  async (request) => {
    // User must have AT LEAST ONE permission
    return NextResponse.json({ success: true });
  }
);
```

### Role Required
```typescript
import { withRole } from '@/lib/rbac/middleware';

export const GET = withRole(adminRoleId, async (request) => {
  // User must have this specific role
  return NextResponse.json(data);
});
```

### Super Admin Only
```typescript
import { withSuperAdmin } from '@/lib/rbac/middleware';

export const DELETE = withSuperAdmin(async (request) => {
  // Only Super Admin can call this endpoint
  return NextResponse.json({ success: true });
});
```

---

## UI Component Guards (Showing/Hiding Elements)

### Single Permission
```typescript
import { PermissionGuard } from '@/components/permission-guard';

<PermissionGuard 
  user={user} 
  permission="users.delete"
>
  <DeleteButton />
</PermissionGuard>
```

### All Permissions Required
```typescript
<PermissionGuard 
  user={user} 
  permissions={['users.create', 'users.edit']}
>
  <EditForm />
</PermissionGuard>
```

### Any Permission
```typescript
<PermissionGuard 
  user={user} 
  anyPermission={['users.view', 'admin.view']}
>
  <ViewButton />
</PermissionGuard>
```

### With Fallback (show if denied)
```typescript
<PermissionGuard 
  user={user} 
  permission="users.delete"
  fallback={<p>You don't have permission to delete</p>}
>
  <DeleteButton />
</PermissionGuard>
```

### Silent (show nothing if denied)
```typescript
<PermissionGuard 
  user={user} 
  permission="admin.settings"
  silent={true}
>
  <AdminButton />
</PermissionGuard>
```

### Role-Based
```typescript
import { RoleGuard } from '@/components/permission-guard';

<RoleGuard 
  user={user} 
  roleIds={[adminRoleId]}
>
  <AdminPanel />
</RoleGuard>
```

### Custom Feature
```typescript
import { FeatureGuard } from '@/components/permission-guard';

<FeatureGuard 
  user={user} 
  featureKey="attendance.correction"
>
  <AttendanceForm />
</FeatureGuard>
```

### Sensitive Operations (with confirmation)
```typescript
import { SensitiveOperation } from '@/components/permission-guard';

<SensitiveOperation
  user={user}
  permission="users.delete"
  confirmPrompt="Delete this user? Cannot be undone."
  onConfirm={() => handleDelete()}
>
  <button>Delete</button>
</SensitiveOperation>
```

---

## Page Protection

### Option 1: HOC (Higher-Order Component)
```typescript
import { withProtectedRoute } from '@/components/route-protected';

function YourPage({ user }) {
  return <PageContent />;
}

export default withProtectedRoute(YourPage, {
  requiredPermission: 'users.view',
  redirectTo: '/unauthorized'
});
```

### Option 2: Wrapper Component
```typescript
import { ProtectedPageWrapper } from '@/components/route-protected';

export default function YourPage({ user }) {
  return (
    <ProtectedPageWrapper
      title="Users"
      user={user}
      requiredPermission="users.view"
      showHeader={true}
    >
      <UserTable />
    </ProtectedPageWrapper>
  );
}
```

### Option 3: Hook
```typescript
import { useAuthorization } from '@/components/route-protected';

export default function YourPage({ user }) {
  const { isAuthorized } = useAuthorization({
    requiredPermission: 'users.view'
  });

  if (!isAuthorized) {
    return <div>Not authorized</div>;
  }

  return <UserTable />;
}
```

---

## Menu Integration

### Show Menu Item Only If Authorized
```typescript
import { PermissionGuard } from '@/components/permission-guard';
import { ADMIN_MENU_ITEMS } from '@/lib/rbac/menu-integration';

{ADMIN_MENU_ITEMS.map((item) => (
  <PermissionGuard
    key={item.href}
    user={user}
    permission={item.requiredPermission || undefined}
    silent={!item.requiredPermission}
  >
    <Link href={item.href}>
      <item.icon />
      {item.label}
    </Link>
  </PermissionGuard>
))}
```

### Hook to Get Visible Items
```typescript
import { useVisibleMenuItems } from '@/lib/rbac/menu-integration';

const visibleGroups = useVisibleMenuItems(user);
// Only includes menu items user has permission for
```

---

## Seed System Roles

```bash
# Run once to populate system roles and permissions
pnpm exec ts-node prisma/seed-rbac.ts

# Creates:
# - 4 system roles (Super Admin, Admin, Academic Head, Teacher)
# - 60+ permissions
# - Role-permission mappings
```

---

## Error Handling

### API Returns
- **200**: User has permission, operation succeeded
- **401**: User not authenticated (no session)
- **403**: User authenticated but lacks permission
- **500**: Server error in middleware

### Component Behavior
- **Authorized**: Shows children
- **Unauthorized**: Shows fallback (or nothing if silent=true)

### Page Behavior
- **Authorized**: Renders page normally
- **Unauthorized**: Shows unauthorized component or redirects

---

## Common Patterns

### Admin-Only Feature
```typescript
<PermissionGuard user={user} permission="settings.edit" silent>
  <SettingsButton />
</PermissionGuard>
```

### Feature with Multiple Levels
```typescript
{/* Always visible - just info */}
<UserData />

{/* Need edit permission */}
<PermissionGuard user={user} permission="users.edit" silent>
  <EditButton />
</PermissionGuard>

{/* Need delete permission - with confirmation */}
<SensitiveOperation
  user={user}
  permission="users.delete"
  confirmPrompt="Delete?"
>
  <DeleteButton />
</SensitiveOperation>
```

### Cascade Permissions
```typescript
// Show section only if user can view OR edit
<PermissionGuard 
  user={user} 
  anyPermission={['reports.view', 'reports.edit']}
>
  <ReportSection />
</PermissionGuard>
```

---

## Debugging

### Check User Permissions
```typescript
import { userHasPermission } from '@/lib/rbac/utils';

const hasAccess = userHasPermission(user, 'users.delete');
console.log(hasAccess); // true or false
```

### Check User Roles
```typescript
import { userHasRole } from '@/lib/rbac/utils';

const isAdmin = userHasRole(user, adminRoleId);
console.log(isAdmin); // true or false
```

### View Audit Logs
```bash
# See all denied permission attempts
pnpm db:studio
# Navigate to RBACLog table
# Filter: action = "PERMISSION_DENIED"
```

---

## Migration Checklist

### For Each API Route
- [ ] Import `withPermission` from middleware
- [ ] Wrap handler with `withPermission()`
- [ ] Test returns 403 when permission denied

### For Each UI Component
- [ ] Import `PermissionGuard`
- [ ] Wrap dangerous actions with `<PermissionGuard>`
- [ ] Test shows/hides based on user role

### For Each Page
- [ ] Import route protection wrapper
- [ ] Add `requiredPermission` prop
- [ ] Test unauthorized redirect

### For Navigation
- [ ] Import menu items from integration
- [ ] Wrap with `<PermissionGuard>`
- [ ] Test shows/hides menu items

---

## Need Help?

- **Setup**: See `RBAC_QUICK_START.md`
- **Implementation**: See `PHASE_3_IMPLEMENTATION_GUIDE.md`
- **Architecture**: See `RBAC_ARCHITECTURE.md`
- **Roadmap**: See `RBAC_IMPLEMENTATION_ROADMAP.md`

---

**TL;DR**: 
- Use `withPermission()` on API routes
- Use `<PermissionGuard>` on UI components
- Use `<ProtectedPageWrapper>` on pages
- Run `pnpm exec ts-node prisma/seed-rbac.ts` once
- Update sidebar with permission checks
