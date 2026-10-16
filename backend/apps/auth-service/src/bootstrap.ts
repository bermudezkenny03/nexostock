import 'dotenv/config';
import { PrismaClient, type Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { isEmail } from 'class-validator';
import { syncSystemRoles } from './business/system-roles';
import { bcryptRounds } from './common/config/bcrypt.config';
import {
  isPlatformBusiness,
  ModuleCode,
  Permission,
  PLATFORM_BUSINESS_ID,
  PLATFORM_BUSINESS_NAME,
  planConfigurationErrors,
  PLATFORM_ROLE_PERMISSIONS,
  PlanCode,
  RoleCode,
} from './common/rbac/permission.constants';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
} from './common/validation';

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

export interface NewSuperAdmin {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export const DEV_SUPER_ADMIN_PASSWORD = 'SuperAdmin123!';
const BOOTSTRAP_LOCK = 'nexostock-auth-bootstrap';

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
  {
    code: ModuleCode.PLATFORM,
    name: 'Platform',
    description: 'Businesses, plans and owner access across the SaaS',
    sortOrder: 100,
    route: '/platform',
    icon: 'globe',
    permissions: [
      {
        action: 'manage',
        name: 'Manage the platform',
        code: Permission.PLATFORM_MANAGE,
      },
    ],
  },
];

async function upsertModule(
  db: Prisma.TransactionClient,
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
  const saved = await db.module.upsert({
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
    await db.permission.upsert({
      where: { code: perm.code },
      update: data,
      create: { code: perm.code, ...data },
    });
  }

  for (const child of moduleSeed.children ?? []) {
    await upsertModule(db, child, saved.id);
  }
}

export async function runBootstrap(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${BOOTSTRAP_LOCK}))::text`;

      const plans = await tx.plan.findMany({ select: { code: true } });
      const planErrors = planConfigurationErrors(plans.map((p) => p.code));
      if (planErrors.length > 0) {
        throw new Error(planErrors.join(' '));
      }

      for (const root of MODULE_TREE) {
        await upsertModule(tx, root, null);
      }

      await tx.business.upsert({
        where: { id: PLATFORM_BUSINESS_ID },
        update: {},
        create: {
          id: PLATFORM_BUSINESS_ID,
          name: PLATFORM_BUSINESS_NAME,
          planCode: PlanCode.PRO,
        },
      });

      const businesses = await tx.business.findMany({ select: { id: true } });
      for (const { id } of businesses) {
        await syncSystemRoles(
          tx,
          id,
          isPlatformBusiness(id) ? PLATFORM_ROLE_PERMISSIONS : undefined,
        );
      }
    },
    { maxWait: 30_000, timeout: 120_000 },
  );
}

export async function ensureSuperAdmin(
  prisma: PrismaClient,
  input: NewSuperAdmin,
): Promise<boolean> {
  const email = input.email.trim().toLowerCase();
  if (!isEmail(email)) {
    throw new Error('SUPER_ADMIN_EMAIL must be a valid email address');
  }
  if (
    input.password.length < PASSWORD_MIN_LENGTH ||
    input.password.length > PASSWORD_MAX_LENGTH ||
    !PASSWORD_PATTERN.test(input.password) ||
    (process.env.NODE_ENV === 'production' &&
      input.password === DEV_SUPER_ADMIN_PASSWORD)
  ) {
    throw new Error(
      `SUPER_ADMIN_PASSWORD must be ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters with a letter and a number, and not the development default`,
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { businessId: true },
  });
  if (existing) {
    if (!isPlatformBusiness(existing.businessId)) {
      throw new Error(`${email} already belongs to a store account`);
    }
    return false;
  }

  const role = await prisma.role.findUniqueOrThrow({
    where: {
      businessId_code: {
        businessId: PLATFORM_BUSINESS_ID,
        code: RoleCode.SUPER_ADMIN,
      },
    },
  });
  const passwordHash = await bcrypt.hash(input.password, bcryptRounds());
  await prisma.$transaction(async (tx) => {
    const admin = await tx.user.create({
      data: {
        email,
        passwordHash,
        businessId: PLATFORM_BUSINESS_ID,
        detail: {
          create: { firstName: input.firstName, lastName: input.lastName },
        },
      },
    });
    await tx.userRole.create({
      data: {
        userId: admin.id,
        roleId: role.id,
        businessId: PLATFORM_BUSINESS_ID,
      },
    });
  });
  return true;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await runBootstrap(prisma);

    const email = process.env.SUPER_ADMIN_EMAIL?.trim();
    const password = process.env.SUPER_ADMIN_PASSWORD;
    if (email && password) {
      const created = await ensureSuperAdmin(prisma, {
        email,
        password,
        firstName: process.env.SUPER_ADMIN_FIRST_NAME ?? 'Super',
        lastName: process.env.SUPER_ADMIN_LAST_NAME ?? 'Admin',
      });
      console.log(
        created
          ? `SUPER_ADMIN ${email} created`
          : `SUPER_ADMIN ${email} already exists`,
      );
    }
    console.log('Bootstrap completed');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
