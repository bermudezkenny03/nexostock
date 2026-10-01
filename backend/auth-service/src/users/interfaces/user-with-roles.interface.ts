import type { Prisma } from '@prisma/client';

export const userAdminInclude = {
  detail: true,
  userRoles: {
    include: {
      role: true,
    },
  },
} as const satisfies Prisma.UserInclude;

export type UserWithRoles = Prisma.UserGetPayload<{
  include: typeof userAdminInclude;
}>;
