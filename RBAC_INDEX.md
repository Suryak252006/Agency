# 📚 RBAC Implementation Index

Quick reference for all RBAC documentation and code.

---

## 🎯 Start Here

**First time?** Start with these in order:

1. **[PHASE_2_CORRECTIONS_SUMMARY.md](./PHASE_2_CORRECTIONS_SUMMARY.md)** - High-level overview of all 8 corrections
2. **[RBAC_CORRECTIONS_COMPLETE.md](./RBAC_CORRECTIONS_COMPLETE.md)** - Detailed implementation guide
3. **[BACKEND_VALIDATION_PATTERN.md](./BACKEND_VALIDATION_PATTERN.md)** - How to implement Phase 3

---

## 📖 Documentation Files

### Overview & Strategy
- **PHASE_2_CORRECTIONS_SUMMARY.md** - Executive summary of all corrections (this session)
- **RBAC_CORRECTIONS_COMPLETE.md** - Complete detailed guide with examples and checklist
- **IMPLEMENTATION_PROGRESS.md** - Original project progress tracking (Phase 1-2)

### Implementation Guides
- **BACKEND_VALIDATION_PATTERN.md** - Three-layer check pattern for all API routes
- **NEXTJS_MIGRATION.md** - Next.js 14 setup and architecture
- **ARCHITECTURE_DECISIONS.md** - Key architectural decisions

---

## 💾 Database Schema

### Location
`prisma/schema.prisma`

### Key Models
- **User** - Authentication principals (Admin/Faculty only)
- **Role** - System and custom roles
- **RoleAssignment** - User→Role mappings (with department scope)
- **Permission** - Granular permissions (60+)
- **RolePermission** - Role→Permission mappings
- **CustomFeature** - Custom features/flags
- **CustomFeatureAssignment** - Feature assignments with temporal support
- **Department** ⭐ - NEW: School departments with HOD
- **FacultyDepartment** ⭐ - NEW: Faculty→Department many-to-many
- **Class** - Classroom (with departmentId)
- **Exam** - Exams (with departmentId, department-scoped)
- **Marks** - Student marks entry
- **RBACLog** - Audit log for RBAC operations

---

## 🔐 Permission System

### Location
`src/lib/rbac/constants.ts`

### System Roles (Fixed)
```
SUPER_ADMIN    Level 4 (Full system access)
ADMIN          Level 3 (School operations)
HOD            Level 2 (Department management)
FACULTY        Level 1 (Department-scoped teaching)
```

### Granular Permissions (60+)
- **users.***: User management (ADMIN only)
- **faculty.***: Faculty management (Admin/HOD)
- **students.***: Student management (all roles)
- **exams.***: Exam management (department-scoped)
- **marks.***: Marks entry/approval (faculty/HOD)
- **results.***: Result viewing/publishing
- **reports.***: Report generation
- **timetable.***: Timetable management
- **attendance.***: Attendance marking
- **roles.***: Role management (ADMIN)
- **permissions.***: Permission management (SUPER_ADMIN)
- **custom_features.***: Feature management (ADMIN)
- **settings.***: Configuration (ADMIN)
- **logs.***: Audit log access (ADMIN)
- **billing.***: Billing management (SUPER_ADMIN)

---

## 🛠️ Core Utilities

### Location
`src/lib/rbac/utils.ts`

### Permission Checking Functions

**Basic Checks:**
- `userHasPermission(user, permission)` - Check single permission
- `userHasAllPermissions(user, permissions[])` - AND logic
- `userHasAnyPermission(user, permissions[])` - OR logic
- `checkPermissionDetailed(user, permission)` - Detailed result

**System Role Checks:**
- `userHasSystemRole(user, systemRole)` - Check specific system role
- `userHasRole(user, roleId)` - Check custom role
- `getUserRoleHierarchy(user)` - Get hierarchy level

**Department-Aware Checks** ⭐
- `userHasPermissionWithDepartment(user, permission, departmentId)` - Permission + dept context
- `canAccessDepartment(user, departmentId, userDepartments)` - Department access validation
- `canManageFacultyInDepartment(actor, targetDepts, actorDepts)` - HOD overlap check
- `getUserDepartmentIds(user)` - Extract department list

**Feature Management:**
- `getActiveCustomFeatures(user)` - Get active features
- `getPendingCustomFeatures(user)` - Get pending acceptance features
- `isFeatureExpired(feature)` - Check expiry
- `getFeatureStatus(feature)` - Get status (active/pending/expired/declined)

**Privilege Management:**
- `canManageUserRoles(actor, targetUser)` - Prevent privilege escalation
- `canEditOwnHighestPrivilege(user)` - Edit own highest role (SUPER_ADMIN only)

---

## 🌐 API Routes

### Location
`src/app/api/rbac/` and other endpoints

### Implemented Endpoints (Phase 1-2)
- `GET/POST /api/rbac/roles` - Role CRUD
- `GET/POST /api/rbac/permissions` - Permission CRUD
- `GET/POST /api/rbac/custom-features` - Custom feature CRUD
- `POST /api/rbac/custom-features/assign` - Feature assignments
- `GET /api/marks` - List marks
- `PATCH /api/marks/[id]/approve` - Approve marks

### Phase 3 Requirements
- All endpoints must validate `departmentId` from request context
- Must use `userHasPermissionWithDepartment()` NOT `userHasPermission()`
- Must call `canAccessDepartment()` or `canManageFacultyInDepartment()`
- Must return 403 with "department access denied" for department mismatches

**See**: `BACKEND_VALIDATION_PATTERN.md` for implementation patterns

---

## 🧪 Component Guards

### Location
`src/components/permission-guard.tsx` (Phase 3)

### Available Components
- `PermissionGuard` - Conditionally render based on permission
- `RoleGuard` - Conditionally render based on role
- `FeatureGuard` - Conditionally render based on feature availability
- `SensitiveOperation` - Confirmation for sensitive operations
- `ConditionalRender` - Generic conditional renderer

### Phase 3 Updates Required
- Add `departmentId` prop support
- Validate department context before rendering
- Show fallback component for no-access

---

## 🔍 Middleware

### Location
`src/lib/rbac/middleware.ts` (Phase 3)

### Available Middleware
- `withPermission(permission)` - Check permission
- `withPermissions(permissions[])` - Check all permissions
- `withAnyPermission(permissions[])` - Check any permission
- `withRole(roleId)` - Check role
- `withSuperAdmin()` - Super admin only
- `withAuthRequired()` - Authentication only

### Phase 3 Updates Required
- Extract `departmentId` from request context
- Pass to permission checks
- Validate department access

---

## 📊 Type Definitions

### Location
`src/types/rbac.ts`

### Key Types
```typescript
interface IUserWithPermissions {
  id: string;
  email: string;
  role: UserRole;
  systemRole?: SystemRole;
  permissions: string[];
  roles: IUserRole[];
  departments: IDepartment[];      // ⭐ NEW
  customFeatures: ICustomFeatureAssignment[];
}

interface IUserRole {
  id: string;
  name: string;
  systemRole?: SystemRole;
  permissions: string[];
  departmentId?: string;            // ⭐ NEW
}

interface IDepartment {
  id: string;
  name: string;
  code?: string;
  headId?: string;
}
```

---

## 🎯 Admin UI Components

### Location
`src/app/admin/` (Phase 2)

### Current Components
- **role-form-modal.tsx** - Create/edit roles with permission selection
- **custom-features.tsx** - Manage custom features
- **custom-feature-form-modal.tsx** - Create/edit features
- **assign-feature-modal.tsx** - Assign features to roles/users

### Phase 3 Updates Required
- Add department selectors to all forms
- Filter faculty lists by HOD's departments
- Add department context to assignments

---

## 🌱 Seed Scripts

### System Roles Seed
**File**: `prisma/seed-rbac.ts`
**Command**: `pnpm exec ts-node prisma/seed-rbac.ts`
**Creates**:
- 4 system roles (SUPER_ADMIN, ADMIN, HOD, FACULTY)
- 60+ permissions
- Default role-permission mappings

### Multi-Department Seed ⭐
**File**: `prisma/seed-departments.ts`
**Command**: `pnpm exec ts-node prisma/seed-departments.ts`
**Creates**:
- 5 departments (Math, Physics, Chemistry, English, CS)
- 5 HODs (one per department)
- 3 faculty with mixed assignments
- Department-scoped exams and classes

---

## ✅ Implementation Checklist

### Phase 2 (Complete) ✅
- [x] Schema: Department model and multi-dept faculty
- [x] Constants: Role naming (HOD/FACULTY)
- [x] Utils: Department-aware functions
- [x] Seeding: Multi-department data
- [x] Documentation: All 8 corrections

### Phase 3 (Ready to Start)
- [ ] Middleware: Extract and validate departmentId
- [ ] API Routes: Three-layer check pattern
- [ ] Component Guards: Department context support
- [ ] Admin UI: Department selectors
- [ ] Testing: Access pattern verification

---

## 🔗 Quick Links

**Production Files**:
- Schema: `prisma/schema.prisma`
- Constants: `src/lib/rbac/constants.ts`
- Utils: `src/lib/rbac/utils.ts`
- Middleware: `src/lib/rbac/middleware.ts` (Phase 3)
- Components: `src/components/permission-guard.tsx` (Phase 3)
- Guards: `src/components/route-protected.tsx` (Phase 3)

**Documentation**:
- This file: `RBAC_INDEX.md`
- Summary: `PHASE_2_CORRECTIONS_SUMMARY.md`
- Complete: `RBAC_CORRECTIONS_COMPLETE.md`
- Patterns: `BACKEND_VALIDATION_PATTERN.md`

**Configuration**:
- Environment: `.env` or `.env.local`
- Database: Supabase PostgreSQL
- Authentication: Supabase Auth (JWT)

---

## 🚀 Quick Commands

```bash
# Apply schema changes
pnpm db:push

# Seed system roles
pnpm exec ts-node prisma/seed-rbac.ts

# Seed multi-department data
pnpm exec ts-node prisma/seed-departments.ts

# Generate Prisma types
npx prisma generate

# Compile TypeScript
pnpm tsc --noEmit

# Run dev server
pnpm dev

# Run tests
pnpm test
```

---

## 📞 Getting Help

**For questions about**:
- **Overall architecture**: Read `RBAC_CORRECTIONS_COMPLETE.md`
- **Implementing Phase 3**: Read `BACKEND_VALIDATION_PATTERN.md`
- **Specific functions**: Check `src/lib/rbac/utils.ts` comments
- **Database schema**: Check `prisma/schema.prisma` comments
- **Access control rules**: Read `RBAC_CORRECTIONS_COMPLETE.md` section 7

---

## 📋 Document Matrix

| Document | Purpose | Audience | Read Time |
|----------|---------|----------|-----------|
| PHASE_2_CORRECTIONS_SUMMARY.md | Executive overview | Everyone | 5 min |
| RBAC_CORRECTIONS_COMPLETE.md | Complete guide | Developers | 20 min |
| BACKEND_VALIDATION_PATTERN.md | Implementation guide | Backend devs | 15 min |
| ARCHITECTURE_DECISIONS.md | Design rationale | Architects | 10 min |
| This file (RBAC_INDEX.md) | Quick reference | Everyone | 5 min |

---

**Last Updated**: Phase 2 completion  
**Status**: ✅ Ready for Phase 3  
**Next**: Implement Middleware & Route Protection with mandatory backend validation
