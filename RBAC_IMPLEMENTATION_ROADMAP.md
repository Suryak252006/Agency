# RBAC + Custom Features System - Implementation Roadmap

## Overview
Enterprise-grade Role-Based Access Control (RBAC) with Custom Feature Access overlay system for School Management SaaS. This system enables admins to manage roles, permissions, custom features, and access assignments across multiple schools/branches.

---

## Architecture Summary

### 3-Layer Design
1. **Data Layer**: Prisma ORM with 8 new models
2. **API Layer**: REST endpoints with permission checks
3. **UI Layer**: React components with permission guards

### Key Models
- **Role**: System roles + custom roles
- **Permission**: Granular permissions (users.view, exams.publish, etc.)
- **RolePermission**: Join table for role-permission mapping
- **RoleAssignment**: Assigns roles to users
- **CustomFeature**: Custom features with metadata
- **CustomFeatureAssignment**: Assigns features to users/roles with temporal access
- **RBACLog**: Audit trail for all RBAC operations

---

## Implementation Phases

### PHASE 1: Database & API (Week 1-2)
**Status**: ✅ COMPLETE

**Tasks**:
- [x] Update Prisma schema with 8 new models
- [x] Create database migrations
- [x] Create TypeScript types (rbac.ts)
- [x] Create permission constants (constants.ts)
- [x] Create utility functions (utils.ts)
- [x] Build Role API routes (GET, POST, PUT, DELETE)
- [x] Build Custom Features API
- [x] Build Custom Feature Assignments API
- [x] Add Audit logging for all operations

**Files Created**:
- src/types/rbac.ts
- src/lib/rbac/constants.ts
- src/lib/rbac/utils.ts
- src/app/api/rbac/roles/route.ts
- src/app/api/rbac/custom-features/route.ts
- src/app/api/rbac/custom-features/assign.ts
- prisma/schema.prisma (updated)

---

### PHASE 2: UI Components (Week 2-3)
**Status**: ✅ COMPLETE

**Tasks**:
- [x] Create Roles List page (RolesPage)
- [x] Create Role Form modal with permission matrix
- [x] Create Custom Features page
- [x] Create Custom Feature Form modal
- [x] Create Assign Feature modal with temporal access
- [x] Create Permission Matrix selector with search
- [x] Create Audit logs viewer

**Files Created**:
- src/app/admin/roles/page.tsx
- src/app/admin/roles/role-form-modal.tsx
- src/app/admin/roles/custom-features.tsx
- src/app/admin/roles/custom-feature-form-modal.tsx
- src/app/admin/roles/assign-feature-modal.tsx

---

### PHASE 3: Middleware & Security (Week 3)
**Status**: 🔄 IN PROGRESS

**Tasks Remaining**:
- [ ] Create permission middleware (withPermission)
- [ ] Create role middleware (withRole)
- [ ] Create route protection wrapper
- [ ] Implement menu visibility engine
- [ ] Add permission guards to components
- [ ] Implement 2FA for sensitive operations
- [ ] Add CSRF protection
- [ ] Create session/JWT validation

**Files to Create**:
- src/middleware/rbac.ts
- src/lib/rbac/middleware.ts
- src/components/permission-guard.tsx
- src/components/route-protected.tsx

---

### PHASE 4: Integration & Testing (Week 4)
**Status**: 🔄 NEXT

**Tasks Remaining**:
- [ ] Update admin sidebar with Roles menu item
- [ ] Add permission checks to existing routes
- [ ] Create seed data for system roles
- [ ] Create integration tests
- [ ] Create E2E tests for RBAC workflows
- [ ] Performance testing (1000+ users)
- [ ] Security audit & penetration testing
- [ ] Documentation

**Files to Update**:
- src/components/app-shell.tsx
- prisma/seed.js

---

### PHASE 5: Advanced Features (Week 5+)
**Status**: 📋 BACKLOG

**Features**:
- [ ] Role versioning / history
- [ ] Bulk user role assignment
- [ ] Excel export of users with roles
- [ ] Approval workflow for sensitive roles
- [ ] Role delegation (temporary)
- [ ] Just-in-Time (JIT) access provisioning
- [ ] Integration with external directories (LDAP/Active Directory)
- [ ] Single Sign-On (SSO) support
- [ ] API key management for service accounts
- [ ] Compliance reports (GDPR, SOC2)

---

## Deployment Checklist

### Pre-Production Setup
- [ ] Database migration executed
- [ ] Environment variables configured
  - [ ] DATABASE_URL
  - [ ] DIRECT_URL
  - [ ] SUPABASE_URL
  - [ ] SUPABASE_KEY
- [ ] RBAC_SEED_ENABLED=true in .env
- [ ] Prisma client generated

### Migration Steps
```bash
# 1. Update schema
prisma db push

# 2. Seed system roles
pnpm exec prisma db seed

# 3. Verify schema
prisma studio

# 4. Update Next.js
npm run build

# 5. Test API endpoints
npm run dev
```

### Post-Deployment Verification
- [ ] Login as Super Admin
- [ ] Verify all 4 system roles exist
- [ ] Create a custom role
- [ ] Assign role to user
- [ ] Create custom feature
- [ ] Assign feature with acceptance
- [ ] Test permission middleware
- [ ] Verify audit logs

---

## Security Best Practices

### Implemented
✅ Granular permissions (module.entity.action)
✅ Role hierarchy enforcement
✅ Privilege escalation prevention
✅ Audit logging on every operation
✅ Server-side permission validation
✅ JWT-based session management
✅ Sensitive operation confirmation
✅ IP logging for compliance

### Recommended
- [ ] 2FA for admin operations
- [ ] Temporary access with auto-expiry
- [ ] Approval workflow for critical roles
- [ ] Rate limiting on permission checks
- [ ] Encrypted permission storage for sensitive data
- [ ] Regular security audits
- [ ] Compliance reporting (GDPR, SOC2)

---

## API Endpoints Reference

### Roles
```
GET    /api/rbac/roles                    - List roles
POST   /api/rbac/roles                    - Create role
GET    /api/rbac/roles/[id]               - Get role details
PUT    /api/rbac/roles/[id]               - Update role
DELETE /api/rbac/roles/[id]               - Delete role
GET    /api/rbac/roles/[id]/permissions   - Get role permissions
```

### Permissions
```
GET    /api/rbac/permissions              - List all permissions
GET    /api/rbac/permissions/matrix       - Get permission matrix
POST   /api/rbac/permissions              - Create permission
PUT    /api/rbac/permissions/[id]         - Update permission
```

### Custom Features
```
GET    /api/rbac/custom-features          - List features
POST   /api/rbac/custom-features          - Create feature
PUT    /api/rbac/custom-features/[id]     - Update feature
DELETE /api/rbac/custom-features/[id]     - Delete feature
```

### Feature Assignments
```
GET    /api/rbac/custom-features/assignments            - List assignments
POST   /api/rbac/custom-features/assign                 - Assign feature
PUT    /api/rbac/custom-features/assign/[id]/accept     - Accept feature
PUT    /api/rbac/custom-features/assign/[id]/decline    - Decline feature
DELETE /api/rbac/custom-features/assign/[id]            - Revoke assignment
```

### Audit Logs
```
GET    /api/rbac/logs                     - List RBAC logs
GET    /api/rbac/logs/user/[userId]       - User's action logs
GET    /api/rbac/logs/role/[roleId]       - Role-related logs
GET    /api/rbac/logs/export              - Export logs as CSV
```

### User Roles
```
GET    /api/rbac/user-roles/[userId]      - Get user's roles
POST   /api/rbac/user-roles               - Assign role to user
DELETE /api/rbac/user-roles/[id]          - Remove role from user
```

---

## Usage Examples

### Check Permission in Component
```typescript
import { userHasPermission } from '@/lib/rbac/utils';

if (userHasPermission(user, 'users.delete')) {
  // Show delete button
}
```

### Protect API Route
```typescript
import { userHasPermission } from '@/lib/rbac/utils';
import { getAppSession } from '@/lib/supabase/middleware';

export async function DELETE(request: NextRequest) {
  const session = await getAppSession();
  
  if (!userHasPermission(session.user, 'users.delete')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Proceed with deletion
}
```

### Check Custom Feature Access
```typescript
import { getActiveCustomFeatures } from '@/lib/rbac/utils';

const features = getActiveCustomFeatures(user);
const hasFeature = features.some(f => f.key === 'attendance.correction');
```

---

## Database Schema Overview

### User Extensions
```sql
-- New fields added to User model
- roles (RoleAssignment[])          -- User's assigned roles
- customFeatures (CustomFeatureAssignment[])  -- Custom features assigned
- createdRoles (Role[])             -- Roles created by this user
- createdCustomFeatures (CustomFeature[])     -- Custom features created
- rbacLogs (RBACLog[])              -- User's actions
```

### New Models
```
Role (system + custom roles)
Permission (granular permissions)
RolePermission (role ↔ permission mapping)
RoleAssignment (user ↔ role assignment)
CustomFeature (custom access features)
CustomFeatureAssignment (temporal feature access)
RBACLog (audit trail)
```

---

## Performance Considerations

### Database Indexes
All tables have appropriate indexes on:
- schoolId (multi-tenancy)
- status fields
- createdAt (for sorting)
- Foreign keys

### Caching Strategy
- Cache permission matrix in memory
- Cache role permissions per user
- Invalidate on role/permission updates
- TTL: 5 minutes

### Pagination
- Default page size: 10
- Max page size: 100
- Offset-based pagination

---

## Testing Strategy

### Unit Tests
- Permission checking functions
- Role hierarchy validation
- Feature expiry logic
- Privilege escalation prevention

### Integration Tests
- Role creation → assignment → usage
- Feature assignment → acceptance → usage
- Audit log generation
- Permission matrix building

### E2E Tests
- Admin creates role
- Assigns permissions
- Creates custom feature
- Assigns to user with expiry
- User accepts/declines
- Verify access

---

## Monitoring & Analytics

### Audit Events Tracked
- ROLE_CREATED
- ROLE_UPDATED
- ROLE_DELETED
- PERMISSION_ASSIGNED
- PERMISSION_REMOVED
- CUSTOM_FEATURE_CREATED
- CUSTOM_FEATURE_ASSIGNED
- CUSTOM_FEATURE_ACCEPTED
- CUSTOM_FEATURE_DECLINED
- CUSTOM_FEATURE_REVOKED
- USER_PERMISSION_DENIED

### Metrics to Monitor
- Avg permission check time
- Cache hit rate
- Failed permission checks (by user, by permission)
- Feature acceptance rate
- Role creation frequency
- Suspicious access patterns

---

## Future Enhancements

### Short-term (1-2 months)
- Bulk user role assignment via CSV
- Role versioning & rollback
- Approval workflow for sensitive roles
- Email notifications for feature assignments

### Medium-term (3-6 months)
- OAuth2/OpenID Connect integration
- LDAP/Active Directory sync
- Service account & API keys
- Role delegation (temporary elevation)
- Custom role templates

### Long-term (6+ months)
- Zero Trust Architecture
- Attribute-Based Access Control (ABAC)
- Dynamic role creation based on rules
- Machine learning for anomaly detection
- Blockchain audit trail
- GraphQL API support

---

## Support & Documentation

### Developer Guide
See: [docs/RBAC_DEVELOPER_GUIDE.md](./docs/RBAC_DEVELOPER_GUIDE.md)

### Admin Guide
See: [docs/RBAC_ADMIN_GUIDE.md](./docs/RBAC_ADMIN_GUIDE.md)

### API Reference
See: [docs/RBAC_API_REFERENCE.md](./docs/RBAC_API_REFERENCE.md)

### Troubleshooting
See: [docs/RBAC_TROUBLESHOOTING.md](./docs/RBAC_TROUBLESHOOTING.md)

---

## Contact & Support

**Product Owner**: [CTO]
**Lead Engineer**: [Engineering Lead]
**Security Contact**: [Security Lead]

---

**Last Updated**: May 2026
**Version**: 1.0.0
