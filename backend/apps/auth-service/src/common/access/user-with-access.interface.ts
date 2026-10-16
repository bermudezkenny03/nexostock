import type { Prisma } from '@prisma/client';

export const userWithAuthInclude = {
  business: true,
  detail: true,
  userRole: {
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  },
} as const satisfies Prisma.UserInclude;

export type UserWithAccess = Prisma.UserGetPayload<{
  include: typeof userWithAuthInclude;
}>;
