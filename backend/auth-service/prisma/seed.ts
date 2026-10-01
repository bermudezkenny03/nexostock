import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  ModuleCode,
  Permission,
  RoleCode,
} from '../src/common/rbac/permission.constants';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@nexostock.local';
const ADMIN_PASSWORD = 'Admin123!';

type PermissionSeed = {
  action: string;
  name: string;
  code: string;
};

type ModuleSeed = {
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  route?: string;
  icon: string;
  standardViewManage?: boolean;
  permissions?: PermissionSeed[];
  children?: ModuleSeed[];
};

const MODULE_TREE: ModuleSeed[] = [
  {
    code: ModuleCode.DASHBOARD,
    name: 'Dashboard',
    description: 'Overview and KPIs',
    sortOrder: 10,
    route: '/dashboard',
    icon: 'layout-dashboard',
    standardViewManage: true,
  },
  {
    code: ModuleCode.PRODUCTS,
    name: 'Products',
    description: 'Product catalog',
    sortOrder: 20,
    route: '/products',
    icon: 'package',
    standardViewManage: true,
  },
  {
    code: ModuleCode.INVENTORY,
    name: 'Inventory',
    description: 'Stock levels and movements',
    sortOrder: 30,
    route: '/inventory',
    icon: 'warehouse',
    standardViewManage: true,
  },
  {
    code: ModuleCode.SALES,
    name: 'Sales',
    description: 'Orders and sales',
    sortOrder: 40,
    route: '/sales',
    icon: 'shopping-cart',
    standardViewManage: true,
  },
  {
    code: ModuleCode.REPORTS,
    name: 'Reports',
    description: 'Analytics and exports',
    sortOrder: 50,
    route: '/reports',
    icon: 'bar-chart',
    standardViewManage: true,
  },
  {
    code: ModuleCode.ADMINISTRATION,
    name: 'Administration',
    description: 'Users, roles and system access',
    sortOrder: 60,
    route: '/admin',
    icon: 'settings',
    children: [
      {
        code: ModuleCode.ADMIN_USERS,
        name: 'Users',
        description: 'Manage users and access',
        sortOrder: 1,
        route: '/admin/users',
        icon: 'users',
        permissions: [
          {
            action: 'manage',
            name: 'Manage users',
            code: Permission.USERS_MANAGE,
          },
          {
            action: 'view',
            name: 'View modules catalog',
            code: Permission.MODULES_VIEW,
          },
        ],
      },
      {
        code: ModuleCode.ADMIN_ROLES,
        name: 'Roles',
        description: 'Roles and permission assignment',
        sortOrder: 2,
        route: '/admin/roles',
        icon: 'shield',
        permissions: [
          {
            action: 'manage',
            name: 'Manage roles',
            code: Permission.ROLES_MANAGE,
          },
        ],
      },
    ],
  },
];

const EMPLOYEE_PERMISSION_CODES: readonly string[] = [
  Permission.DASHBOARD_VIEW,
  Permission.PRODUCTS_VIEW,
  Permission.INVENTORY_VIEW,
  Permission.SALES_VIEW,
  Permission.REPORTS_VIEW,
];

async function main(): Promise<void> {
  const permissionRecords: Array<{ id: string; code: string }> = [];

  async function upsertModule(
    moduleSeed: ModuleSeed,
    parentId: string | null,
  ): Promise<void> {
    const saved = await prisma.module.upsert({
      where: { code: moduleSeed.code },
      update: {
        name: moduleSeed.name,
        description: moduleSeed.description,
        sortOrder: moduleSeed.sortOrder,
        route: moduleSeed.route ?? null,
        icon: moduleSeed.icon,
        parentId,
      },
      create: {
        code: moduleSeed.code,
        name: moduleSeed.name,
        description: moduleSeed.description,
        sortOrder: moduleSeed.sortOrder,
        route: moduleSeed.route ?? null,
        icon: moduleSeed.icon,
        parentId,
      },
    });

    const permissionSeeds: PermissionSeed[] = [...(moduleSeed.permissions ?? [])];

    if (moduleSeed.standardViewManage) {
      permissionSeeds.push(
        {
          action: 'view',
          name: `${moduleSeed.name} — view`,
          code: `${moduleSeed.code}.view`,
        },
        {
          action: 'manage',
          name: `${moduleSeed.name} — manage`,
          code: `${moduleSeed.code}.manage`,
        },
      );
    }

    for (const perm of permissionSeeds) {
      const permission = await prisma.permission.upsert({
        where: { code: perm.code },
        update: {
          name: perm.name,
          action: perm.action,
          moduleId: saved.id,
        },
        create: {
          code: perm.code,
          name: perm.name,
          action: perm.action,
          moduleId: saved.id,
        },
      });
      const existing = permissionRecords.find((p) => p.code === permission.code);
      if (existing) {
        existing.id = permission.id;
      } else {
        permissionRecords.push({ id: permission.id, code: permission.code });
      }
    }

    for (const child of moduleSeed.children ?? []) {
      await upsertModule(child, saved.id);
    }
  }

  for (const root of MODULE_TREE) {
    await upsertModule(root, null);
  }

  const adminRole = await prisma.role.upsert({
    where: { code: RoleCode.ADMIN },
    update: {
      name: 'Administrator',
      description: 'Full system access',
      isSystem: true,
    },
    create: {
      code: RoleCode.ADMIN,
      name: 'Administrator',
      description: 'Full system access',
      isSystem: true,
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: { code: RoleCode.EMPLOYEE },
    update: {
      name: 'Employee',
      description: 'Standard operational access',
      isSystem: true,
    },
    create: {
      code: RoleCode.EMPLOYEE,
      name: 'Employee',
      description: 'Standard operational access',
      isSystem: true,
    },
  });

  for (const permission of permissionRecords) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  const employeePermissionIds = permissionRecords
    .filter((p) => EMPLOYEE_PERMISSION_CODES.includes(p.code))
    .map((p) => p.id);

  for (const permissionId of employeePermissionIds) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: employeeRole.id,
          permissionId,
        },
      },
      update: {},
      create: {
        roleId: employeeRole.id,
        permissionId,
      },
    });
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      passwordHash,
      isActive: true,
    },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      isActive: true,
    },
  });

  await prisma.userDetail.upsert({
    where: { userId: adminUser.id },
    update: {
      firstName: 'System',
      lastName: 'Admin',
    },
    create: {
      userId: adminUser.id,
      firstName: 'System',
      lastName: 'Admin',
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
