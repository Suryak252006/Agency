# RBAC System - Quick Setup & Initialization Guide

## ⚡ Quick Start

### 1. Database Migration
```bash
# Apply schema changes to database
pnpm db:push

# Or use migrations (recommended for prod)
pnpm db:migrate
```

### 2. Seed System Roles
```bash
# Run seed to create default roles
pnpm db:seed
```

This creates:
- **Super Admin**: Full system access
- **Admin**: School operations
- **Academic Head/VP**: Teacher & curriculum management
- **Teacher/Faculty**: Class & student access only

### 3. Verify Setup
```bash
# Open Prisma Studio to inspect data
pnpm db:studio

# You should see:
# - 4 system roles in Role table
# - ~40+ permissions in Permission table
# - Role-Permission mappings
# - 1 Super Admin user (principal@school.in)
# - 9 Faculty users
# - 100 Students
```

### 4. Login & Test
```
Super Admin: principal@school.in / password123
Faculty: faculty@school.in / password123
```

Navigate to: `http://localhost:3000/admin/roles`

---

## 📋 Environment Variables

Add to `.env.local`:
```
DATABASE_URL=postgresql://user:pass@localhost:5432/school
DIRECT_URL=postgresql://user:pass@localhost:5432/school
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

---

## 🔐 System Roles Reference

### Super Admin
```
✓ ALL permissions
✓ Manage other admins
✓ Billing & subscriptions
✓ Security logs & backups
✓ Multi-school management
✓ Hidden from role list (only 1-2 users)
```

### Admin
```
✓ User management
✓ Teacher management
✓ Student management
✓ Exam management
✓ Results publishing
✓ Create custom features
✓ Assign features to users
✗ Cannot touch billing
✗ Cannot access security logs
```

### Academic Head / VP
```
✓ Teacher management & assignment
✓ Class scheduling
✓ Exam creation & publication
✓ Marks approval
✓ Student performance reports
✓ Syllabus tracking
✗ No finance access
✗ No user management
```

### Teacher / Faculty
```
✓ View assigned classes
✓ Enter & submit marks
✓ Mark attendance
✓ View student performance
✓ Download class reports
✗ No admin panel access
✗ No other teacher data
```

---

## 🎯 Permission System

### Format: `module.entity.action`

#### Users Module
- `users.view` - View user list
- `users.create` - Add users
- `users.edit` - Edit user details
- `users.delete` - Delete users

#### Teachers Module
- `teachers.view`
- `teachers.create`
- `teachers.edit`
- `teachers.delete`
- `teachers.assign` - Assign to classes

#### Students Module
- `students.view`
- `students.create`
- `students.edit`
- `students.delete`
- `students.bulk_import`

#### Exams Module
- `exams.view`
- `exams.create`
- `exams.publish`
- `exams.delete`

#### Marks Module
- `marks.view`
- `marks.create`
- `marks.submit`
- `marks.approve`
- `marks.lock`

#### Results Module
- `results.view`
- `results.publish`
- `results.export`

#### Reports Module
- `reports.view`
- `reports.export`
- `reports.create`

#### Custom Features Module
- `custom_features.view`
- `custom_features.create`
- `custom_features.assign`
- `custom_features.delete`

#### Roles & Permissions Module
- `roles.view`
- `roles.create`
- `roles.edit`
- `roles.delete`

---

## 🎁 Custom Features System

Create special access features for specific scenarios:

### Example 1: Lab Inventory Access
```
Feature Name: Lab Inventory
Feature Key: inventory.lab.access
Module: Inventory
Type: Menu Page
Scope: Department
Assigned To: Physics HOD
Expiry: Permanent
```

### Example 2: Temporary Finance Report Access
```
Feature Name: Finance Export
Feature Key: finance.salary.export
Module: Finance
Type: Report
Scope: User Specific
Assigned To: Accountant (user)
Start Date: 2025-01-01
Expiry Date: 2025-03-31
Requires Acceptance: YES
```

### Example 3: Attendance Correction (Limited Time)
```
Feature Name: Attendance Correction
Feature Key: attendance.correction
Module: Attendance
Type: Button Action
Scope: Global
Assigned To: Dean (user)
Start Date: 2025-02-15
Expiry Date: 2025-02-22 (7 days only)
Requires Acceptance: YES
```

---

## 🔄 Feature Assignment Workflow

### If `Requires Acceptance = ON`
1. Admin assigns feature to user
2. User receives notification
3. User accepts/declines feature
4. Access only activates after acceptance

### If `Requires Acceptance = OFF`
1. Admin assigns feature to user
2. Access immediately active
3. User can see in "Special Access" section

### Auto-Expiry
- System checks expiry date on each request
- Expired features automatically deactivate
- User can see "Expires in X days" badge
- No action needed from admin

---

## 🛡️ Security Features

✅ **Privilege Escalation Prevention**
- Users cannot edit their own highest role
- Super Admin only exception
- Backend validates on every request

✅ **Audit Logging**
Every action logged:
- Who did it (actor)
- What happened (action)
- When (timestamp)
- Where (IP address)
- Why (metadata)

✅ **Sensitive Operation Confirmation**
Delete operations require confirmation:
- Delete user
- Delete role
- Delete feature
- Billing changes

✅ **Role Hierarchy**
```
Super Admin (4)
↓
Admin (3)
↓
Academic Head (2)
↓
Teacher (1)
```

Higher level can manage lower levels only.

---

## 🧪 Testing Scenarios

### Scenario 1: Create Custom Role
1. Login as Admin
2. Go to Roles & Permissions → Roles
3. Click "Create Role"
4. Name: "Lab Coordinator"
5. Select permissions:
   - students.view
   - exams.view
6. Save → Verify created

### Scenario 2: Assign Feature with Expiry
1. Go to Custom Features tab
2. Click "Create Feature"
3. Fill details (Lab Inventory)
4. Save → Go to Assignments
5. Click "Create Assignment"
6. Select role: "Lab Coordinator"
7. Set expiry: 30 days
8. Assign → Verify in assignments list

### Scenario 3: Accept Feature
1. Create assignment with `Requires Acceptance = ON`
2. Login as target user
3. Should see "Pending Features" in profile
4. Click "Accept" → Access granted
5. Verify feature now visible in special access

---

## 📊 Monitoring & Debugging

### View Audit Logs
```bash
# Via Prisma Studio
pnpm db:studio
# Navigate to RBACLog table
```

### Check User Permissions
```typescript
import { prisma } from '@/lib/db';

const userRoles = await prisma.roleAssignment.findMany({
  where: { userId: 'user_id' },
  include: { role: { include: { permissions: true } } },
});
```

### Debug Permission Check
```typescript
import { checkPermissionDetailed } from '@/lib/rbac/utils';

const result = checkPermissionDetailed(user, 'exams.publish');
console.log(result); // { allowed: true, by: 'role' }
```

### Monitor Custom Features
```bash
# Count active features
pnpm db:studio
# Query CustomFeature where status = 'ACTIVE'

# Check assignments
# Query CustomFeatureAssignment where expiryDate > NOW()
```

---

## 🚨 Common Issues & Solutions

### Issue: "Permission Denied" for super-admin
**Cause**: Role not properly assigned
**Solution**:
```bash
# Check role assignment
pnpm db:studio
# Query RoleAssignment for user

# Manually assign if needed
```

### Issue: Custom feature not visible
**Cause**: 
- Expired
- Not accepted yet
- User lacks base permission

**Solution**:
1. Check expiry date
2. Check acceptedAt field
3. Verify assignment exists

### Issue: Audit logs not recording
**Cause**: RBAC logging function throwing error
**Solution**: 
- Check RBACLog permissions in database
- Verify actor user exists
- Check ipAddress is not null

---

## 📚 API Examples

### Create Role
```bash
curl -X POST http://localhost:3000/api/rbac/roles \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lab Coordinator",
    "description": "Manages lab access",
    "scope": "DEPARTMENT",
    "permissionIds": [
      "perm_students_view",
      "perm_exams_view"
    ]
  }'
```

### Assign Custom Feature
```bash
curl -X POST http://localhost:3000/api/rbac/custom-features/assign \
  -H "Content-Type: application/json" \
  -d '{
    "featureId": "feature_123",
    "userId": "user_456",
    "startDate": "2025-02-15",
    "expiryDate": "2025-02-22",
    "requiresAcceptance": true
  }'
```

### Accept Feature
```bash
curl -X PUT http://localhost:3000/api/rbac/custom-features/assign/assign_789/accept \
  -H "Content-Type: application/json"
```

---

## 🎓 Best Practices

### For Admins
1. ✅ Review permissions before creating custom features
2. ✅ Set expiry dates for temporary access
3. ✅ Require acceptance for sensitive features
4. ✅ Regularly audit user roles in logs
5. ❌ Don't assign "super admin" to everyone
6. ❌ Don't create overlapping custom features

### For Developers
1. ✅ Always check permissions on backend
2. ✅ Log all RBAC operations
3. ✅ Use permission constants (don't hardcode strings)
4. ✅ Cache permission matrix (5-min TTL)
5. ✅ Validate permission exists before checking
6. ❌ Never trust frontend permission checks
7. ❌ Don't pass permissions in JWT claims directly

---

## 🔗 Related Documentation

- [RBAC_IMPLEMENTATION_ROADMAP.md](./RBAC_IMPLEMENTATION_ROADMAP.md) - Full architecture
- [API_SCHEMA.md](./API_SCHEMA.md) - API specifications
- [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md) - Design rationale

---

## ✅ Initialization Checklist

- [ ] Database migration applied
- [ ] Seed script executed
- [ ] 4 system roles created
- [ ] All permissions loaded
- [ ] Admin user created (principal@school.in)
- [ ] Faculty users created
- [ ] Student users created
- [ ] Permissions assigned to system roles
- [ ] Dashboard accessible
- [ ] Roles page accessible
- [ ] Can create custom role
- [ ] Can create custom feature
- [ ] Can assign feature to user
- [ ] Audit logs recording

---

**Ready to go!** 🚀

For issues, check [RBAC_TROUBLESHOOTING.md](./docs/RBAC_TROUBLESHOOTING.md)
