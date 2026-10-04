import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  DEV_SUPER_ADMIN_PASSWORD,
  ensureSuperAdmin,
  runBootstrap,
} from './bootstrap';
import { syncSystemRoles } from './business/system-roles';
import { bcryptRounds } from './common/config/bcrypt.config';
import { RoleCode } from './common/rbac/permission.constants';

if (process.env.NODE_ENV === 'production') {
  console.error(
    'The seed creates accounts with known passwords. Refusing to run with NODE_ENV=production.',
  );
  process.exit(1);
}

const prisma = new PrismaClient();

const DEFAULT_BUSINESS_ID = '00000000-0000-4000-8000-000000000001';
const DEFAULT_PRIMARY_COLOR = '#0F766E';
const ADMIN_EMAIL = 'admin@nexostock.local';
const ADMIN_PASSWORD = 'Admin123!';
const SUPER_ADMIN_EMAIL = 'superadmin@nexostock.local';

async function main(): Promise<void> {
  await runBootstrap(prisma);

  const business = await prisma.business.upsert({
    where: { id: DEFAULT_BUSINESS_ID },
    update: {},
    create: {
      id: DEFAULT_BUSINESS_ID,
      name: 'NexoStock Demo',
      primaryColor: DEFAULT_PRIMARY_COLOR,
    },
  });
  const roleIds = await syncSystemRoles(prisma, business.id);

  await ensureSuperAdmin(prisma, {
    email: SUPER_ADMIN_EMAIL,
    password: DEV_SUPER_ADMIN_PASSWORD,
    firstName: 'Super',
    lastName: 'Admin',
  });

  const existingAdmin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
  });
  if (existingAdmin) {
    return;
  }

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
      data: {
        userId: admin.id,
        roleId: roleIds[RoleCode.OWNER],
        businessId: business.id,
      },
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
