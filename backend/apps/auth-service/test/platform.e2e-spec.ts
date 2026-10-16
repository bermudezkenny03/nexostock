import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { runBootstrap } from '../src/bootstrap';
import {
  ModuleCode,
  Permission,
  PLAN_PERMISSIONS,
  PLATFORM_BUSINESS_ID,
  PLATFORM_ROLE_PERMISSIONS,
  RoleCode,
} from '../src/common/rbac/permission.constants';

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());
const describeIfDb = hasDatabase ? describe : describe.skip;

const SUPER_ADMIN = {
  email: 'superadmin@nexostock.local',
  password: 'SuperAdmin123!',
};
const DEMO_OWNER = { email: 'admin@nexostock.local', password: 'Admin123!' };
const PASSWORD = 'SecurePass1';

interface Session {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    businessId: string;
    roles: string[];
    permissions: string[];
  };
}

interface ErrorBody {
  message: string;
  code?: string;
}

interface PlatformBusiness {
  id: string;
  name: string;
  isActive: boolean;
  plan: { code: string; maxUsers: number | null };
  activeUsers: number;
  owners: Array<{ id: string; email: string }>;
}

interface BusinessPage {
  items: PlatformBusiness[];
  total: number;
}

function body<T>(response: { body: unknown }): T {
  return response.body as T;
}

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}@e2e.local`;
}

describeIfDb('SaaS platform (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = new PrismaClient();
  const createdBusinessIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdRoleIds: string[] = [];

  const http = () => request(app.getHttpServer());
  const auth = (session: Session) => `Bearer ${session.accessToken}`;

  async function login(email: string, password: string): Promise<Session> {
    const res = await http()
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    return body<Session>(res);
  }

  async function registerBusiness(): Promise<Session & { email: string }> {
    const email = uniqueEmail('owner');
    const res = await http()
      .post('/api/auth/register')
      .send({
        businessName: `E2E SaaS ${Date.now()}`,
        firstName: 'Dueña',
        lastName: 'E2E',
        email,
        password: PASSWORD,
      })
      .expect(201);
    const session = body<Session>(res);
    createdBusinessIds.push(session.user.businessId);
    return { ...session, email };
  }

  async function roleIdOf(session: Session, code: string): Promise<string> {
    const res = await http()
      .get('/api/roles')
      .set('Authorization', auth(session))
      .expect(200);
    const role = body<Array<{ id: string; code: string }>>(res).find(
      (r) => r.code === code,
    );
    if (!role) {
      throw new Error(`role ${code} missing`);
    }
    return role.id;
  }

  function createUser(
    session: Session,
    roleId: string,
    email = uniqueEmail('user'),
  ) {
    return http().post('/api/users').set('Authorization', auth(session)).send({
      email,
      password: PASSWORD,
      firstName: 'Test',
      lastName: 'User',
      roleId,
    });
  }

  async function createUserOk(
    session: Session,
    roleId: string,
  ): Promise<string> {
    const res = await createUser(session, roleId).expect(201);
    const { id } = body<{ id: string }>(res);
    createdUserIds.push(id);
    return id;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.listen(0);
  });

  afterAll(async () => {
    await prisma.platformAuditLog.deleteMany({
      where: {
        OR: [
          { businessId: { in: createdBusinessIds } },
          { actorUserId: { in: createdUserIds } },
        ],
      },
    });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.user.deleteMany({
      where: { businessId: { in: createdBusinessIds } },
    });
    await prisma.role.deleteMany({ where: { id: { in: createdRoleIds } } });
    await prisma.role.deleteMany({
      where: { businessId: { in: createdBusinessIds } },
    });
    await prisma.business.deleteMany({
      where: { id: { in: createdBusinessIds } },
    });
    await app.close();
    await prisma.$disconnect();
  });

  describe('access', () => {
    it('only lets the provider team into /api/platform', async () => {
      await http().get('/api/platform/businesses').expect(401);

      const owner = await login(DEMO_OWNER.email, DEMO_OWNER.password);
      await http()
        .get('/api/platform/businesses')
        .set('Authorization', auth(owner))
        .expect(403);

      const admin = await login(SUPER_ADMIN.email, SUPER_ADMIN.password);
      expect(admin.user.businessId).toBe(PLATFORM_BUSINESS_ID);
      expect(admin.user.roles).toEqual([RoleCode.SUPER_ADMIN]);
      expect([...admin.user.permissions].sort()).toEqual(
        [...(PLATFORM_ROLE_PERMISSIONS.SUPER_ADMIN ?? [])].sort(),
      );
    });
  });

  describe('businesses and plans', () => {
    it('lists plans and businesses, never the provider business', async () => {
      const admin = await login(SUPER_ADMIN.email, SUPER_ADMIN.password);
      const store = await registerBusiness();

      const plans = body<Array<{ code: string }>>(
        await http()
          .get('/api/platform/plans')
          .set('Authorization', auth(admin))
          .expect(200),
      );
      expect(plans.map((p) => p.code)).toEqual(['FREE', 'BASIC', 'PRO']);

      const page = body<BusinessPage>(
        await http()
          .get('/api/platform/businesses')
          .query({ search: store.email, pageSize: 100 })
          .set('Authorization', auth(admin))
          .expect(200),
      );
      expect(page.total).toBe(1);
      expect(page.items[0].id).toBe(store.user.businessId);
      expect(page.items[0].plan.code).toBe('FREE');
      expect(page.items[0].owners.map((o) => o.email)).toEqual([store.email]);

      const all = body<BusinessPage>(
        await http()
          .get('/api/platform/businesses')
          .query({ pageSize: 100 })
          .set('Authorization', auth(admin))
          .expect(200),
      );
      expect(all.items.map((b) => b.id)).not.toContain(PLATFORM_BUSINESS_ID);

      await http()
        .get(`/api/platform/businesses/${PLATFORM_BUSINESS_ID}`)
        .set('Authorization', auth(admin))
        .expect(404);
    });

    it('deactivates a business, closes its sessions and reactivates it', async () => {
      const admin = await login(SUPER_ADMIN.email, SUPER_ADMIN.password);
      const store = await registerBusiness();
      const path = `/api/platform/businesses/${store.user.businessId}/status`;

      await http()
        .patch(path)
        .set('Authorization', auth(admin))
        .send({ isActive: false, reason: 'e2e' })
        .expect(200);

      const denied = await http()
        .post('/api/auth/login')
        .send({ email: store.email, password: PASSWORD })
        .expect(403);
      expect(body<ErrorBody>(denied).code).toBe('BUSINESS_INACTIVE');
      await http()
        .post('/api/auth/refresh')
        .send({ refreshToken: store.refreshToken })
        .expect(401);

      await http()
        .patch(path)
        .set('Authorization', auth(admin))
        .send({ isActive: true })
        .expect(200);
      await login(store.email, PASSWORD);
    });

    it('enforces the user limit of the plan on create and reactivate', async () => {
      const admin = await login(SUPER_ADMIN.email, SUPER_ADMIN.password);
      const store = await registerBusiness();
      const salesRole = await roleIdOf(store, RoleCode.SALES_EMPLOYEE);

      const first = await createUserOk(store, salesRole);
      const blocked = await createUser(store, salesRole).expect(403);
      expect(body<ErrorBody>(blocked).code).toBe('PLAN_LIMIT_REACHED');

      await http()
        .patch(`/api/users/${first}`)
        .set('Authorization', auth(store))
        .send({ isActive: false })
        .expect(200);
      await createUserOk(store, salesRole);
      const reactivate = await http()
        .patch(`/api/users/${first}`)
        .set('Authorization', auth(store))
        .send({ isActive: true })
        .expect(403);
      expect(body<ErrorBody>(reactivate).code).toBe('PLAN_LIMIT_REACHED');

      const upgraded = body<PlatformBusiness>(
        await http()
          .patch(`/api/platform/businesses/${store.user.businessId}/plan`)
          .set('Authorization', auth(admin))
          .send({ planCode: 'BASIC' })
          .expect(200),
      );
      expect(upgraded.plan.code).toBe('BASIC');

      await http()
        .patch(`/api/users/${first}`)
        .set('Authorization', auth(store))
        .send({ isActive: true })
        .expect(200);

      const profile = body<{ plan: { code: string }; activeUsers: number }>(
        await http()
          .get('/api/business/me')
          .set('Authorization', auth(store))
          .expect(200),
      );
      expect(profile.plan.code).toBe('BASIC');
      expect(profile.activeUsers).toBe(3);

      await http()
        .patch(`/api/platform/businesses/${store.user.businessId}/plan`)
        .set('Authorization', auth(admin))
        .send({ planCode: 'NOPE' })
        .expect(404);
    });

    it('resets the password of an owner and closes their sessions', async () => {
      const admin = await login(SUPER_ADMIN.email, SUPER_ADMIN.password);
      const store = await registerBusiness();
      const base = `/api/platform/businesses/${store.user.businessId}/owners`;

      await http()
        .post(`${base}/${store.user.id}/password`)
        .set('Authorization', auth(admin))
        .send({ newPassword: 'Recuperada123' })
        .expect(204);

      await http()
        .post('/api/auth/refresh')
        .send({ refreshToken: store.refreshToken })
        .expect(401);
      await login(store.email, 'Recuperada123');

      const employee = await createUserOk(
        await login(store.email, 'Recuperada123'),
        await roleIdOf(store, RoleCode.SALES_EMPLOYEE),
      );
      await http()
        .post(`${base}/${employee}/password`)
        .set('Authorization', auth(admin))
        .send({ newPassword: 'Recuperada123' })
        .expect(404);
    });
  });

  describe('audit log', () => {
    interface AuditPage {
      total: number;
      items: Array<{
        action: string;
        actor: { email: string };
        targetUser: { id: string } | null;
        details: Record<string, unknown> | null;
      }>;
    }

    it('records every platform action with its details, newest first', async () => {
      const admin = await login(SUPER_ADMIN.email, SUPER_ADMIN.password);
      const store = await registerBusiness();
      const base = `/api/platform/businesses/${store.user.businessId}`;

      await http()
        .patch(`${base}/status`)
        .set('Authorization', auth(admin))
        .send({ isActive: true })
        .expect(200);
      await http()
        .patch(`${base}/status`)
        .set('Authorization', auth(admin))
        .send({ isActive: false, reason: 'Pago pendiente' })
        .expect(200);
      await http()
        .patch(`${base}/status`)
        .set('Authorization', auth(admin))
        .send({ isActive: true })
        .expect(200);
      await http()
        .patch(`${base}/plan`)
        .set('Authorization', auth(admin))
        .send({ planCode: 'BASIC' })
        .expect(200);
      await http()
        .patch(`${base}/plan`)
        .set('Authorization', auth(admin))
        .send({ planCode: 'BASIC' })
        .expect(200);
      await http()
        .post(`${base}/owners/${store.user.id}/password`)
        .set('Authorization', auth(admin))
        .send({ newPassword: 'Recuperada123' })
        .expect(204);

      const page = body<AuditPage>(
        await http()
          .get('/api/platform/audit-logs')
          .query({ businessId: store.user.businessId })
          .set('Authorization', auth(admin))
          .expect(200),
      );

      expect(page.items.map((i) => i.action)).toEqual([
        'OWNER_PASSWORD_RESET',
        'PLAN_CHANGED',
        'BUSINESS_ACTIVATED',
        'BUSINESS_DEACTIVATED',
      ]);
      expect(page.items.every((i) => i.actor.email === SUPER_ADMIN.email)).toBe(
        true,
      );
      expect(page.items[0].targetUser?.id).toBe(store.user.id);
      expect(page.items[1].details).toEqual({ from: 'FREE', to: 'BASIC' });
      expect(page.items[3].details).toEqual({ reason: 'Pago pendiente' });

      const owner = await login(DEMO_OWNER.email, DEMO_OWNER.password);
      await http()
        .get('/api/platform/audit-logs')
        .set('Authorization', auth(owner))
        .expect(403);
    });
  });

  describe('plan permissions', () => {
    const sorted = (codes: readonly string[]) => [...codes].sort();
    type ModuleNode = { code: string; children: ModuleNode[] };
    const flatten = (nodes: ModuleNode[]): string[] =>
      nodes.flatMap((n) => [n.code, ...flatten(n.children)]);

    it('gives each store only what its plan unlocks', async () => {
      const free = await login('dueno@donpepe.local', 'Demo123!');
      expect(sorted(free.user.permissions)).toEqual(
        sorted(PLAN_PERMISSIONS.FREE),
      );

      const catalog = body<Array<{ code: string }>>(
        await http()
          .get('/api/permissions')
          .set('Authorization', auth(free))
          .expect(200),
      );
      expect(sorted(catalog.map((p) => p.code))).toEqual(
        sorted(PLAN_PERMISSIONS.FREE),
      );

      const modules = flatten(
        body<ModuleNode[]>(
          await http()
            .get('/api/modules')
            .set('Authorization', auth(free))
            .expect(200),
        ),
      );
      expect(modules).toEqual(
        expect.arrayContaining([ModuleCode.PRODUCTS, ModuleCode.ADMIN_USERS]),
      );
      for (const hidden of [
        ModuleCode.DASHBOARD,
        ModuleCode.REPORTS,
        ModuleCode.ADMIN_ROLES,
        ModuleCode.PLATFORM,
      ]) {
        expect(modules).not.toContain(hidden);
      }

      await http()
        .get('/api/roles')
        .set('Authorization', auth(free))
        .expect(200);
      await http()
        .post('/api/roles')
        .set('Authorization', auth(free))
        .send({ name: `Custom ${Date.now()}`, permissionIds: [] })
        .expect(403);

      const basic = await login('dueno@ellapiz.local', 'Demo123!');
      expect(sorted(basic.user.permissions)).toEqual(
        sorted(PLAN_PERMISSIONS.BASIC),
      );

      const pro = await login(DEMO_OWNER.email, DEMO_OWNER.password);
      expect(sorted(pro.user.permissions)).toEqual(
        sorted(PLAN_PERMISSIONS.PRO),
      );
    });

    it('unlocks the new permissions on the next refresh after an upgrade', async () => {
      const admin = await login(SUPER_ADMIN.email, SUPER_ADMIN.password);
      const store = await registerBusiness();
      expect(store.user.permissions).not.toContain(Permission.REPORTS_VIEW);

      await http()
        .patch(`/api/platform/businesses/${store.user.businessId}/plan`)
        .set('Authorization', auth(admin))
        .send({ planCode: 'PRO' })
        .expect(200);

      const refreshed = body<{ accessToken: string }>(
        await http()
          .post('/api/auth/refresh')
          .send({ refreshToken: store.refreshToken })
          .expect(200),
      );
      const me = body<{ permissions: string[] }>(
        await http()
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${refreshed.accessToken}`)
          .expect(200),
      );
      expect(me.permissions).toContain(Permission.REPORTS_MANAGE);
    });
  });

  describe('platform permission', () => {
    it('never reaches a store role and stays hidden from stores', async () => {
      const owner = await login(DEMO_OWNER.email, DEMO_OWNER.password);
      const ownerCatalog = body<Array<{ code: string }>>(
        await http()
          .get('/api/permissions')
          .set('Authorization', auth(owner))
          .expect(200),
      );
      expect(ownerCatalog.map((p) => p.code)).not.toContain(
        Permission.PLATFORM_MANAGE,
      );

      const platformManage = await prisma.permission.findUniqueOrThrow({
        where: { code: Permission.PLATFORM_MANAGE },
      });
      const res = await http()
        .post('/api/roles')
        .set('Authorization', auth(owner))
        .send({
          name: `Plataforma ${Date.now()}`,
          permissionIds: [platformManage.id],
        })
        .expect(403);
      expect(body<ErrorBody>(res).message).toBe(
        'Los permisos de plataforma solo se asignan a roles del equipo de NexoStock',
      );
    });

    it('rejects writes from a deactivated provider user with a live token', async () => {
      const admin = await login(SUPER_ADMIN.email, SUPER_ADMIN.password);
      const platformManage = await prisma.permission.findUniqueOrThrow({
        where: { code: Permission.PLATFORM_MANAGE },
      });

      const supportRole = body<{ id: string }>(
        await http()
          .post('/api/roles')
          .set('Authorization', auth(admin))
          .send({
            name: `Soporte ${Date.now()}`,
            permissionIds: [platformManage.id],
          })
          .expect(201),
      );
      createdRoleIds.push(supportRole.id);

      const email = uniqueEmail('support');
      const created = await createUser(admin, supportRole.id, email).expect(
        201,
      );
      const supportId = body<{ id: string }>(created).id;
      createdUserIds.push(supportId);

      const support = await login(email, PASSWORD);
      const store = await registerBusiness();
      await http()
        .patch(`/api/platform/businesses/${store.user.businessId}/plan`)
        .set('Authorization', auth(support))
        .send({ planCode: 'PRO' })
        .expect(200);

      await http()
        .patch(`/api/users/${supportId}`)
        .set('Authorization', auth(admin))
        .send({ isActive: false })
        .expect(200);

      await http()
        .patch(`/api/platform/businesses/${store.user.businessId}/plan`)
        .set('Authorization', auth(support))
        .send({ planCode: 'FREE' })
        .expect(403);
    });
  });

  describe('bootstrap', () => {
    const BOOTSTRAP_TIMEOUT_MS = 60_000;

    it(
      'is idempotent, even when two runs overlap',
      async () => {
        const counts = () =>
          Promise.all([
            prisma.module.count(),
            prisma.permission.count(),
            prisma.business.count({ where: { id: PLATFORM_BUSINESS_ID } }),
            prisma.role.count({ where: { businessId: PLATFORM_BUSINESS_ID } }),
          ]);

        const before = await counts();
        await Promise.all([runBootstrap(prisma), runBootstrap(prisma)]);
        expect(await counts()).toEqual(before);
      },
      BOOTSTRAP_TIMEOUT_MS,
    );

    it(
      'refuses to start when a plan has no permissions configured',
      async () => {
        await prisma.plan.create({
          data: { code: 'E2E_ORPHAN', name: 'E2E orphan', sortOrder: 99 },
        });
        try {
          await expect(runBootstrap(prisma)).rejects.toThrow('E2E_ORPHAN');
        } finally {
          await prisma.plan.delete({ where: { code: 'E2E_ORPHAN' } });
        }
      },
      BOOTSTRAP_TIMEOUT_MS,
    );
  });
});
