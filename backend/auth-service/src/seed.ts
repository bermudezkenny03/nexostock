import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  DEV_SUPER_ADMIN_PASSWORD,
  ensureSuperAdmin,
  runBootstrap,
} from './bootstrap';
import { syncSystemRoles } from './business/system-roles';
import { bcryptRounds } from './common/config/bcrypt.config';
import {
  RoleCode,
  type RoleCodeValue,
} from './common/rbac/permission.constants';

if (process.env.NODE_ENV === 'production') {
  console.error(
    'The seed creates accounts with known passwords. Refusing to run with NODE_ENV=production.',
  );
  process.exit(1);
}

const prisma = new PrismaClient();

const SUPER_ADMIN_EMAIL = 'superadmin@nexostock.local';
const DEMO_PASSWORD = 'Demo123!';

type DemoUser = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: RoleCodeValue;
};

type DemoBusiness = {
  id: string;
  name: string;
  primaryColor: string;
  users: DemoUser[];
};

const DEMO_BUSINESSES: DemoBusiness[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'NexoStock Demo',
    primaryColor: '#0F766E',
    users: [
      {
        email: 'admin@nexostock.local',
        password: 'Admin123!',
        firstName: 'System',
        lastName: 'Admin',
        role: RoleCode.OWNER,
      },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Tienda Don Pepe',
    primaryColor: '#B45309',
    users: [
      {
        email: 'dueno@donpepe.local',
        password: DEMO_PASSWORD,
        firstName: 'José',
        lastName: 'Ramírez',
        role: RoleCode.OWNER,
      },
      {
        email: 'inventario@donpepe.local',
        password: DEMO_PASSWORD,
        firstName: 'Marta',
        lastName: 'Gómez',
        role: RoleCode.INVENTORY_ADMIN,
      },
      {
        email: 'ventas@donpepe.local',
        password: DEMO_PASSWORD,
        firstName: 'Luis',
        lastName: 'Torres',
        role: RoleCode.SALES_EMPLOYEE,
      },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    name: 'Papelería El Lápiz',
    primaryColor: '#1D4ED8',
    users: [
      {
        email: 'dueno@ellapiz.local',
        password: DEMO_PASSWORD,
        firstName: 'Carolina',
        lastName: 'Méndez',
        role: RoleCode.OWNER,
      },
      {
        email: 'inventario@ellapiz.local',
        password: DEMO_PASSWORD,
        firstName: 'Andrés',
        lastName: 'Castro',
        role: RoleCode.INVENTORY_ADMIN,
      },
      {
        email: 'ventas@ellapiz.local',
        password: DEMO_PASSWORD,
        firstName: 'Paula',
        lastName: 'Rojas',
        role: RoleCode.SALES_EMPLOYEE,
      },
    ],
  },
];

/** Creates the business and its missing users. Never overwrites an account. */
async function seedBusiness(demo: DemoBusiness): Promise<void> {
  await prisma.business.upsert({
    where: { id: demo.id },
    update: {},
    create: { id: demo.id, name: demo.name, primaryColor: demo.primaryColor },
  });
  const roleIds = await syncSystemRoles(prisma, demo.id);

  for (const user of demo.users) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    });
    if (existing) {
      continue;
    }

    const passwordHash = await bcrypt.hash(user.password, bcryptRounds());
    await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: user.email,
          passwordHash,
          businessId: demo.id,
          detail: {
            create: { firstName: user.firstName, lastName: user.lastName },
          },
        },
      });
      await tx.userRole.create({
        data: {
          userId: created.id,
          roleId: roleIds[user.role],
          businessId: demo.id,
        },
      });
    });
  }
}

async function main(): Promise<void> {
  await runBootstrap(prisma);

  await ensureSuperAdmin(prisma, {
    email: SUPER_ADMIN_EMAIL,
    password: DEV_SUPER_ADMIN_PASSWORD,
    firstName: 'Super',
    lastName: 'Admin',
  });

  for (const demo of DEMO_BUSINESSES) {
    await seedBusiness(demo);
  }
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
