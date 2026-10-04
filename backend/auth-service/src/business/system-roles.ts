import type { Prisma } from '@prisma/client';
import {
  ROLE_PERMISSIONS,
  RoleCode,
  RoleName,
  type RoleCodeValue,
} from '../common/rbac/permission.constants';

export const SYSTEM_ROLE_CODES: readonly RoleCodeValue[] = [
  RoleCode.OWNER,
  RoleCode.INVENTORY_ADMIN,
  RoleCode.SALES_EMPLOYEE,
];

export type SystemRoleIds = Record<RoleCodeValue, string>;

export async function syncSystemRoles(
  db: Prisma.TransactionClient,
  businessId: string,
): Promise<SystemRoleIds> {
  const permissions = await db.permission.findMany({
    select: { id: true, code: true },
  });
  const idByCode = new Map(permissions.map((p) => [p.code, p.id]));

  const roleIds: Partial<SystemRoleIds> = {};

  for (const code of SYSTEM_ROLE_CODES) {
    const permissionIds = ROLE_PERMISSIONS[code].map((permissionCode) => {
      const id = idByCode.get(permissionCode);
      if (!id) {
        throw new Error(
          `Permission ${permissionCode} is missing from the catalog. Run the seed first.`,
        );
      }
      return id;
    });

    const role = await db.role.upsert({
      where: { businessId_code: { businessId, code } },
      update: { name: RoleName[code], isSystem: true },
      create: {
        businessId,
        code,
        name: RoleName[code],
        description: RoleName[code],
        isSystem: true,
      },
    });

    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    await db.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId: role.id,
        permissionId,
      })),
    });

    roleIds[code] = role.id;
  }

  return roleIds as SystemRoleIds;
}
