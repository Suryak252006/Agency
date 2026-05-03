import { db } from '@/lib/db';
import type { IUserWithPermissions } from '@/types/rbac';

/**
 * Server-only utility.
 * Fetches the full RBAC profile for a user from the database.
 * Roles → permissions are denormalised into a flat string array so
 * shouldShowMenuItem / userHasPermissionWithDepartment work without
 * any extra logic at the call site.
 *
 * Returns null when the user record cannot be found.
 * Returns a user with an empty permissions array (not null) when
 * the user exists but has no RBAC roles assigned yet.
 */
export async function getUserWithPermissions(
  userId: string,
): Promise<IUserWithPermissions | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
      customFeatures: {
        include: { feature: true },
      },
    },
  });

  if (!user) return null;

  const permissions = Array.from(
    new Set(
      user.roles.flatMap((assignment) =>
        assignment.role.permissions.map((rp) => rp.permission.key),
      ),
    ),
  );

  const roles = user.roles.map(
    (a) => a.role as IUserWithPermissions['roles'][number],
  );

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    schoolId: user.schoolId,
    roles,
    permissions,
    customFeatures: user.customFeatures as IUserWithPermissions['customFeatures'],
    hasPermission: (p: string) => permissions.includes(p),
    hasFeature: (key: string) =>
      user.customFeatures.some((a) => a.feature?.key === key),
    hasRole: (id: string) => roles.some((r) => r.id === id),
  };
}
