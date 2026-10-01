import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { Permission } from '../src/common/rbac/permission.constants';

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());
const describeIfDb = hasDatabase ? describe : describe.skip;

const ADMIN = { email: 'admin@nexostock.local', password: 'Admin123!' };

interface Session {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    businessId: string;
    businessName: string;
    roles: string[];
    permissions: string[];
  };
}

interface IdBody {
  id: string;
}

interface RoleBody {
  id: string;
  code: string;
  userCount: number;
}

interface PermissionBody {
  id: string;
  code: string;
}

function body<T>(response: { body: unknown }): T {
  return response.body as T;
}

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}@e2e.local`;
}

describeIfDb('Tenancy and security (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = new PrismaClient();
  const createdBusinessIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdRoleIds: string[] = [];

  const http = () => request(app.getHttpServer());

  async function login(email: string, password: string): Promise<Session> {
    const res = await http()
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    return body<Session>(res);
  }

  async function roleId(token: string, code: string): Promise<string> {
    const res = await http()
      .get('/api/roles')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const role = body<RoleBody[]>(res).find((r) => r.code === code);
    if (!role) {
      throw new Error(`role ${code} missing`);
    }
    return role.id;
  }

  async function createUser(
    token: string,
    roleIdValue: string,
    password = 'SecurePass1',
  ): Promise<{ id: string; email: string; password: string }> {
    const email = uniqueEmail('user');
    const res = await http()
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email,
        password,
        firstName: 'Test',
        lastName: 'User',
        roleId: roleIdValue,
      })
      .expect(201);
    const { id } = body<IdBody>(res);
    createdUserIds.push(id);
    return { id, email, password };
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

  describe('POST /api/auth/register', () => {
    it('creates an isolated business with system roles and signs in its owner', async () => {
      const email = uniqueEmail('owner');
      const res = await http()
        .post('/api/auth/register')
        .send({
          businessName: '  Papelería E2E  ',
          firstName: 'Ana',
          lastName: 'Pérez',
          email: email.toUpperCase(),
          password: 'SecurePass1',
        })
        .expect(201);
      const session = body<Session>(res);
      createdBusinessIds.push(session.user.businessId);

      expect(session.user.email).toBe(email);
      expect(session.user.businessName).toBe('Papelería E2E');
      expect(session.user.roles).toEqual(['OWNER']);
      expect(session.user.permissions).toContain(Permission.BUSINESS_MANAGE);

      const token = session.accessToken;
      const roles = body<RoleBody[]>(
        await http()
          .get('/api/roles')
          .set('Authorization', `Bearer ${token}`)
          .expect(200),
      );
      expect(roles.map((r) => r.code).sort()).toEqual([
        'INVENTORY_ADMIN',
        'OWNER',
        'SALES_EMPLOYEE',
      ]);

      const users = body<Array<{ email: string }>>(
        await http()
          .get('/api/users')
          .set('Authorization', `Bearer ${token}`)
          .expect(200),
      );
      expect(users.map((u) => u.email)).toEqual([email]);

      const admin = await login(ADMIN.email, ADMIN.password);
      await http()
        .get(`/api/users/${admin.user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('rejects a duplicate email and a weak password', async () => {
      await http()
        .post('/api/auth/register')
        .send({
          businessName: 'Dup',
          firstName: 'A',
          lastName: 'B',
          email: ADMIN.email,
          password: 'SecurePass1',
        })
        .expect(409);

      await http()
        .post('/api/auth/register')
        .send({
          businessName: 'Weak',
          firstName: 'A',
          lastName: 'B',
          email: uniqueEmail('weak'),
          password: 'onlyletters',
        })
        .expect(400);
    });
  });

  describe('refresh tokens', () => {
    it('detects reuse and closes every session of the user', async () => {
      const first = await login(ADMIN.email, ADMIN.password);
      const second = await login(ADMIN.email, ADMIN.password);

      await http()
        .post('/api/auth/refresh')
        .send({ refreshToken: first.refreshToken })
        .expect(200);

      await http()
        .post('/api/auth/refresh')
        .send({ refreshToken: first.refreshToken })
        .expect(401);

      await http()
        .post('/api/auth/refresh')
        .send({ refreshToken: second.refreshToken })
        .expect(401);
    });

    it('lets only one of two concurrent refreshes win', async () => {
      const session = await login(ADMIN.email, ADMIN.password);
      const results = await Promise.all([
        http()
          .post('/api/auth/refresh')
          .send({ refreshToken: session.refreshToken }),
        http()
          .post('/api/auth/refresh')
          .send({ refreshToken: session.refreshToken }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 401]);
    });

    it('POST /api/auth/logout-all revokes every refresh token', async () => {
      const first = await login(ADMIN.email, ADMIN.password);
      const second = await login(ADMIN.email, ADMIN.password);

      await http()
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${second.accessToken}`)
        .expect(204);

      for (const session of [first, second]) {
        await http()
          .post('/api/auth/refresh')
          .send({ refreshToken: session.refreshToken })
          .expect(401);
      }
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('requires the current password and closes other sessions', async () => {
      const admin = await login(ADMIN.email, ADMIN.password);
      const user = await createUser(
        admin.accessToken,
        await roleId(admin.accessToken, 'SALES_EMPLOYEE'),
      );
      const session = await login(user.email, user.password);

      await http()
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ currentPassword: 'WrongPass1', newPassword: 'NewSecure2' })
        .expect(400);

      await http()
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ currentPassword: user.password, newPassword: 'NewSecure2' })
        .expect(204);

      await http()
        .post('/api/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);

      await login(user.email, 'NewSecure2');
    });
  });

  describe('validation', () => {
    it('answers 400, not 500, when a required field is sent as null', async () => {
      const admin = await login(ADMIN.email, ADMIN.password);
      const user = await createUser(
        admin.accessToken,
        await roleId(admin.accessToken, 'SALES_EMPLOYEE'),
      );

      for (const field of [
        'email',
        'firstName',
        'lastName',
        'isActive',
        'roleId',
      ]) {
        await http()
          .patch(`/api/users/${user.id}`)
          .set('Authorization', `Bearer ${admin.accessToken}`)
          .send({ [field]: null })
          .expect(400);
      }

      await http()
        .patch('/api/business/me')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ name: null })
        .expect(400);
    });
  });

  describe('roles', () => {
    it('refuses to delete a role that is still assigned', async () => {
      const admin = await login(ADMIN.email, ADMIN.password);
      const created = await http()
        .post('/api/roles')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ name: `Temp role ${Date.now()}` })
        .expect(201);
      const role = body<RoleBody>(created);
      createdRoleIds.push(role.id);

      const user = await createUser(admin.accessToken, role.id);

      await http()
        .delete(`/api/roles/${role.id}`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(409);

      await http()
        .patch(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ roleId: await roleId(admin.accessToken, 'SALES_EMPLOYEE') })
        .expect(200);

      await http()
        .delete(`/api/roles/${role.id}`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(204);
    });

    it('stops a non-owner admin from escalating privileges', async () => {
      const admin = await login(ADMIN.email, ADMIN.password);
      const permissions = body<PermissionBody[]>(
        await http()
          .get('/api/permissions')
          .set('Authorization', `Bearer ${admin.accessToken}`)
          .expect(200),
      );
      const idOf = (code: string) => {
        const found = permissions.find((p) => p.code === code);
        if (!found) {
          throw new Error(`permission ${code} missing`);
        }
        return found.id;
      };

      const managerRole = body<RoleBody>(
        await http()
          .post('/api/roles')
          .set('Authorization', `Bearer ${admin.accessToken}`)
          .send({
            name: `Manager ${Date.now()}`,
            permissionIds: [
              idOf(Permission.USERS_MANAGE),
              idOf(Permission.ROLES_MANAGE),
            ],
          })
          .expect(201),
      );
      createdRoleIds.push(managerRole.id);

      const manager = await createUser(admin.accessToken, managerRole.id);
      const session = await login(manager.email, manager.password);
      const ownerRoleId = await roleId(session.accessToken, 'OWNER');

      await http()
        .post('/api/roles')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({
          name: `Escalation ${Date.now()}`,
          permissionIds: [idOf(Permission.BUSINESS_MANAGE)],
        })
        .expect(403);

      await http()
        .post('/api/users')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({
          email: uniqueEmail('fake-owner'),
          password: 'SecurePass1',
          firstName: 'Fake',
          lastName: 'Owner',
          roleId: ownerRoleId,
        })
        .expect(403);

      await http()
        .patch(`/api/users/${admin.user.id}`)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ password: 'Hijacked123' })
        .expect(403);

      await http()
        .patch('/api/business/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ name: 'Hijacked' })
        .expect(403);
    });
  });
});
