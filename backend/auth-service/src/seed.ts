import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { syncSystemRoles } from './business/system-roles';
import { bcryptRounds } from './common/config/bcrypt.config';
import {
  ModuleCode,
  Permission,
  RoleCode,
} from './common/rbac/permission.constants';

if (process.env.NODE_ENV === 'production') {
  console.error(
    'The seed creates a demo business with a known password. Refusing to run with NODE_ENV=production.',
  );
  process.exit(1);
}

const prisma = new PrismaClient();

const DEFAULT_BUSINESS_ID = '00000000-0000-4000-8000-000000000001';
const DEFAULT_PRIMARY_COLOR = '#0F766E';
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
      {
        code: ModuleCode.ADMIN_BUSINESS,
        name: 'Business',
        description: 'Business profile and visual identity',
        sortOrder: 3,
        route: '/admin/business',
        icon: 'building',
        permissions: [
          {
            action: 'manage',
            name: 'Manage business profile',
            code: Permission.BUSINESS_MANAGE,
          },
        ],
      },
    ],
  },
];

async function upsertModule(
  moduleSeed: ModuleSeed,
  parentId: string | null,
): Promise<void> {
  const fields = {
    name: moduleSeed.name,
    description: moduleSeed.description,
    sortOrder: moduleSeed.sortOrder,
    route: moduleSeed.route ?? null,
    icon: moduleSeed.icon,
    parentId,
  };
  const saved = await prisma.module.upsert({
    where: { code: moduleSeed.code },
    update: fields,
    create: { code: moduleSeed.code, ...fields },
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
    const data = { name: perm.name, action: perm.action, moduleId: saved.id };
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: data,
      create: { code: perm.code, ...data },
    });
  }

  for (const child of moduleSeed.children ?? []) {
    await upsertModule(child, saved.id);
  }
}

async function main(): Promise<void> {
  for (const root of MODULE_TREE) {
    await upsertModule(root, null);
  }

  const business = await prisma.business.upsert({
    where: { id: DEFAULT_BUSINESS_ID },
    update: {},
    create: {
      id: DEFAULT_BUSINESS_ID,
      name: 'NexoStock Demo',
      primaryColor: DEFAULT_PRIMARY_COLOR,
    },
  });

  const businesses = await prisma.business.findMany({ select: { id: true } });
  for (const { id } of businesses) {
    await syncSystemRoles(prisma, id);
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
  });
  if (existingAdmin) {
    return;
  }

  const ownerRole = await prisma.role.findUniqueOrThrow({
    where: {
      businessId_code: { businessId: business.id, code: RoleCode.OWNER },
    },
  });

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, bcryptRounds());
  await prisma.$transaction(async (tx) => {
    const admin = await tx.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash,
        businessId: business.id,
        detail: { create: { firstName: 'System', lastName: 'Admin' } },
      },
    });
    await tx.userRole.create({
      data: { userId: admin.id, roleId: ownerRole.id, businessId: business.id },
    });
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
