# Phase 1 Security E2E Test Suite

Comprehensive security tests for multi-tenant RBAC + RLS architecture.

## Quick Start

### 1. Setup Test Environment

```bash
# Copy test environment template
cp .env.test.example .env.test.local

# Edit with your test database credentials
# DATABASE_URL and DIRECT_URL should point to a test database
nano .env.test.local
```

### 2. Create Test Database

```bash
# Create test database (if not exists)
createdb academia_test

# Apply schema
pnpm db:push --database-url "postgresql://user:password@localhost:5432/academia_test"
```

### 3. Seed Test Data

```bash
# Seed School A and School B with test users/departments/roles
pnpm exec ts-node tests/e2e/security/seed-helpers.ts

# Output should show:
# 🌱 Seeding School A...
# 🌱 Seeding School B...
# ✓ Test data seeded
```

### 4. Run Tests

```bash
pnpm test:e2e:security
```

## Test Data Structure

After seeding, the following test data is created:

### School A
- **Admin**: `rbac-test-admin-a` (Physics + Math departments)
- **HOD Physics**: `rbac-test-hod-physics` (Physics only)
- **HOD Math**: `rbac-test-hod-math` (Math only)
- **Faculty Physics**: `rbac-test-faculty-physics` (Physics only)
- **Faculty Math**: `rbac-test-faculty-math` (Math only)
- **Faculty Shared**: `rbac-test-faculty-shared` (Physics + Math)

### School B
- **Admin**: `rbac-test-admin-b` (Chemistry + Biology departments)
- **HOD Chemistry**: `rbac-test-hod-chemistry-b` (Chemistry only)
- **HOD Biology**: `rbac-test-hod-biology-b` (Biology only)
- **Faculty Chemistry**: `rbac-test-faculty-chemistry-b` (Chemistry only)
- **Faculty Biology**: `rbac-test-faculty-biology-b` (Biology only)

All test data uses the `rbac-test-` namespace for safe cleanup.

## Tests Covered

### 1. Tenant Isolation (`tenant-isolation.test.ts`)
- User from School A cannot read School B data
- Admin from School A cannot manage School B faculty
- Cross-school queries return empty or 403

**Passing Criteria:**
- ✓ Admin A cannot access School B classes
- ✓ Admin B cannot access School A classes
- ✓ Admin A only sees School A classes
- ✓ Admin B only sees School B classes
- ✓ Admin A cannot create faculty in School B

### 2. Department Scope (`department-scope.test.ts`)
- Physics HOD can access Physics faculty
- Physics HOD cannot access Math-only faculty
- Faculty sees only their assigned department

**Passing Criteria:**
- ✓ HOD Physics accesses Physics classes
- ✓ HOD Physics cannot access Math classes
- ✓ HOD Math accesses Math classes
- ✓ HOD Math cannot access Physics classes
- ✓ Faculty Physics sees own department classes
- ✓ Faculty Physics cannot access Math classes
- ✓ Department query respects scope

### 3. Role Permissions (`role-permissions.test.ts`)
- Faculty cannot access admin APIs
- HOD cannot create Super Admin
- Admin cannot edit Super Admin
- Super Admin can access all

**Passing Criteria:**
- ✓ Faculty cannot access admin APIs
- ✓ Faculty cannot create roles
- ✓ Admin can view classes
- ✓ Faculty can view classes (permitted)
- ✓ Faculty cannot lock marks (admin only)
- ✓ Super Admin has universal access

### 4. Custom Features (`custom-features.test.ts`)
- Feature assigned to user works
- Feature assigned to department works
- Expired feature is blocked
- Feature assignment creates audit log

**Passing Criteria:**
- ✓ Faculty accesses active assigned feature
- ✓ Faculty cannot access expired feature
- ✓ Feature expiry is enforced
- ✓ Admin can assign feature to user
- ✓ Admin can assign feature to department
- ✓ Expired feature cannot be used
- ✓ Admin cannot assign expired feature

### 5. RLS Validation (`rls-validation.test.ts`)
- Browser Supabase client respects RLS
- Service role key is never exposed in browser
- Direct cross-school query respects isolation
- Prisma (service role) bypasses RLS (expected)

**Passing Criteria:**
- ✓ Service role key not exposed in browser
- ✓ Browser client uses anon key
- ✓ RLS isolates schools
- ✓ Faculty from School A cannot access School B
- ✓ Prisma service access bypasses RLS
- ✓ RLS policy: school_id isolation
- ✓ Cross-school query returns empty with RLS

### 6. Audit Logs (`audit-logs.test.ts`)
- Role changes create logs
- Permission changes create logs
- Custom feature assignments create logs
- Failed access attempts create logs
- Logs include IP address
- Logs are immutable

**Passing Criteria:**
- ✓ Role assignment creates audit log
- ✓ Permission change creates audit log
- ✓ Custom feature assignment creates audit log
- ✓ Failed access attempt is logged
- ✓ Marks submission creates audit log
- ✓ Audit logs include IP address
- ✓ Audit logs are immutable
- ✓ Audit logs queryable by school_id

## Running Tests

### Run all E2E security tests
```bash
pnpm test:e2e:security
```

### Run tests in watch mode (auto-rerun on changes)
```bash
pnpm test:e2e:security:watch
```

### Run specific test file
```bash
pnpm test:e2e:security tenant-isolation.test.ts
```

### Run all tests (unit + integration + E2E)
```bash
pnpm test
```

### Run with coverage report
```bash
pnpm test:coverage
```

## Environment Variables

### Required for tests
```env
DATABASE_URL=postgresql://user:password@localhost:5432/academia_test
DIRECT_URL=postgresql://user:password@localhost:5432/academia_test
```

### Required for JWT generation
```env
AUTH_SECRET=test_secret_minimum_32_characters_long_for_security
```

### Required for Supabase RLS tests
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx
```

### Optional
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
TEST_TIMEOUT_MS=30000
TEST_DATABASE_CLEANUP=true
```

## Test Data Helpers

Located in `seed-helpers.ts`:

### Seed individual components
```typescript
import { 
  seedSchool,
  seedDepartment,
  seedUser,
  seedRole,
  seedRoleAssignment,
  cleanupTestData 
} from './seed-helpers';

// Create custom test data
const dept = await seedDepartment('school_id', 'physics', 'Physics Department');
const user = await seedUser('custom-user', 'John Doe', UserRole.FACULTY, 'school_id');
```

### Seed complete schools
```typescript
import { seedSchoolA, seedSchoolB } from './seed-helpers';

// Creates entire school with users, departments, roles
const schoolA = await seedSchoolA();
```

### Cleanup only test data
```typescript
import { cleanupTestData } from './seed-helpers';

// Safe - only deletes data with 'rbac-test-' prefix
await cleanupTestData();
```

## Debugging Failed Tests

### Check test data was seeded
```bash
pnpm exec ts-node -e "
import { prisma } from './tests/e2e/security/setup';
const users = await prisma.user.findMany({ where: { email: { contains: 'rbac-test' } } });
console.log('Test users:', users.length);
await prisma.\$disconnect();
"
```

### Run single test with verbose output
```bash
VITE_TEST_DEBUG=true pnpm test:e2e:security tenant-isolation.test.ts
```

### Check database connection
```bash
psql postgresql://user:password@localhost:5432/academia_test -c "SELECT count(*) FROM \"user\";"
```

## Common Issues

### Tests timeout
- Increase `testTimeout` in `vitest.config.ts`
- Ensure database is running: `pnpm db:push`
- Check network latency to database

### JWT validation fails
- Verify `AUTH_SECRET` is 32+ characters
- Check Supabase keys in `.env.test.local`

### Database connection error
- Ensure test database exists: `createdb academia_test`
- Verify credentials in `DATABASE_URL`
- Check PostgreSQL is running

### Test data not found
- Run seed script: `pnpm exec ts-node tests/e2e/security/seed-helpers.ts`
- Verify seeding completed without errors

### Cleanup fails
- May be expected - test data may not exist
- Check disk space and database permissions
- Verify `TEST_DATABASE_CLEANUP=true` in `.env.test.local`

## Security Checklist

Before Phase 2, ensure:

- [ ] All tenant isolation tests pass (✓)
- [ ] All department scope tests pass (✓)
- [ ] All role permission tests pass (✓)
- [ ] All custom feature tests pass (✓)
- [ ] All RLS validation tests pass (✓)
- [ ] All audit log tests pass (✓)
- [ ] Service role key is NOT in `NEXT_PUBLIC_*` vars
- [ ] RLS policies are enabled on all sensitive tables
- [ ] Database backups are configured
- [ ] Audit logs are immutable (no UPDATE/DELETE policies)
- [ ] Test data cleanup is verified safe
- [ ] Production data is never mixed with test data

## CI/CD Integration

For GitHub Actions (Phase 2):

```yaml
name: Security Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with: { node-version: '18', cache: 'pnpm' }
      - run: pnpm install
      - run: pnpm exec ts-node tests/e2e/security/seed-helpers.ts
      - run: pnpm test:e2e:security
```

## Next Steps

After Phase 1 E2E tests pass:

1. **Phase 2**: Add exam, results, timetable tests
2. **Phase 3**: Add realtime, notifications tests
3. **Integration**: Add CI/CD pipeline to run tests on every PR
4. **Performance**: Add load tests for marks submission
5. **Backup**: Test disaster recovery procedures

## References

- [Vitest Documentation](https://vitest.dev)
- [Supabase RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Prisma Testing Guide](https://www.prisma.io/docs/orm/prisma-client/testing)
- [JWT Testing Best Practices](https://jwt.io)

