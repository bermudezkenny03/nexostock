import type { Prisma } from '@prisma/client';

export const roleWithPermissionsInclude = {
  rolePermissions: {
    include: {
      permission: true,
    },
  },
  _count: { select: { userRoles: true } },
} as const satisfies Prisma.RoleInclude;

export type RoleWithPermissions = Prisma.RoleGetPayload<{
  include: typeof roleWithPermissionsInclude;
}>;
