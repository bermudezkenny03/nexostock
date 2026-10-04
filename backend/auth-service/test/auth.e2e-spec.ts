import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { RoleCode } from '../src/common/rbac/permission.constants';

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());

interface LoginUserBody {
  id: string;
  email: string;
  businessId: string;
  businessName: string;
  businessPrimaryColor: string | null;
  businessLogoUrl: string | null;
  roles: string[];
}

interface LoginBody {
  accessToken: string;
  refreshToken: string;
  user: LoginUserBody;
}

interface RefreshBody {
  accessToken: string;
  refreshToken: string;
}

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  code?: string;
  timestamp: string;
  path: string;
}

interface BusinessBody {
  primaryColor: string | null;
  logoUrl: string | null;
  isActive: boolean;
}

interface MeBody {
  email: string;
  businessId: string;
  businessPrimaryColor: string | null;
  businessLogoUrl: string | null;
  roles: string[];
}

interface UserWriteBody {
  id: string;
  roleCode: string | null;
}

interface RoleBody {
  id: string;
  code: string;
}

interface UserListBody {
  email: string;
}

interface AccessClaims {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  businessId: string;
  roles: string[];
}

function readBody<T>(response: { body: unknown }): T {
  return response.body as T;
}

function accessTtlSeconds(): number {
  const raw = process.env.JWT_EXPIRES_IN ?? '15m';
  const match = /^(\d+)([smhd])$/.exec(raw.trim());
  if (!match?.[1] || !match[2]) {
    return 900;
  }
  const amount = Number.parseInt(match[1], 10);
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  return amount * (multipliers[match[2]] ?? 60);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function readJwtPayload(token: string): AccessClaims {
  const part = token.split('.')[1];
  if (!part) {
    throw new Error('missing jwt payload');
  }
  const parsed: unknown = JSON.parse(
    Buffer.from(part, 'base64url').toString('utf8'),
  ) as unknown;
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('bad jwt payload');
  }
  const record = parsed as Record<string, unknown>;
  const aud = typeof record.aud === 'string' ? record.aud : undefined;
  if (
    typeof record.iss !== 'string' ||
    aud === undefined ||
    typeof record.exp !== 'number' ||
    typeof record.iat !== 'number' ||
    typeof record.businessId !== 'string' ||
    !isStringArray(record.roles)
  ) {
    throw new Error('bad jwt payload');
  }
  return {
    iss: record.iss,
    aud,
    exp: record.exp,
    iat: record.iat,
    businessId: record.businessId,
    roles: record.roles,
  };
}

const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb('Auth (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = new PrismaClient();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('GET /api/health', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('POST /api/auth/login success', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@nexostock.local',
        password: 'Admin123!',
      })
      .expect(200);

    const body = readBody<LoginBody>(res);
    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.refreshToken).toEqual(expect.any(String));
    expect(body.user.email).toBe('admin@nexostock.local');
    expect(body.user.businessId).toEqual(expect.any(String));
    expect(body.user.businessName).toBe('NexoStock Demo');
    expect(body.user.businessPrimaryColor).toBe('#0F766E');
    expect(body.user.businessLogoUrl).toBeNull();
    expect(body.user.roles).toEqual(['OWNER']);

    const payload = readJwtPayload(body.accessToken);
    expect(payload.iss).toBe(process.env.JWT_ISSUER ?? 'nexostock-auth');
    expect(payload.aud).toBe(process.env.JWT_AUDIENCE ?? 'nexostock-api');
    expect(payload.businessId).toBe(body.user.businessId);
    expect(payload.roles).toEqual(['OWNER']);
    if (typeof payload.exp === 'number' && typeof payload.iat === 'number') {
      expect(payload.exp - payload.iat).toBe(accessTtlSeconds());
    }
  });

  it('POST /api/auth/refresh and logout', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@nexostock.local',
        password: 'Admin123!',
      })
      .expect(200);

    const oldRefresh = readBody<LoginBody>(login).refreshToken;

    const refreshed = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(200);

    const refreshedBody = readBody<RefreshBody>(refreshed);
    expect(refreshedBody.accessToken).toEqual(expect.any(String));
    expect(refreshedBody.refreshToken).toEqual(expect.any(String));
    expect(refreshedBody.refreshToken).not.toBe(oldRefresh);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(401);

    const activeRefresh = refreshedBody.refreshToken;

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({ refreshToken: activeRefresh })
      .expect(204);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: activeRefresh })
      .expect(401);
  });

  it('POST /api/auth/login invalid credentials', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@nexostock.local',
        password: 'wrong-password',
      })
      .expect(401)
      .expect((res) => {
        const body = readBody<ErrorBody>(res);
        expect(body.statusCode).toBe(401);
        expect(body.message).toBeDefined();
        expect(body.timestamp).toEqual(expect.any(String));
        expect(body.path).toContain('/api/auth/login');
      });
  });

  it('GET /api/auth/me with token', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@nexostock.local',
        password: 'Admin123!',
      })
      .expect(200);

    const session = readBody<LoginBody>(login);

    return request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200)
      .expect((res) => {
        const me = readBody<MeBody>(res);
        expect(me.email).toBe('admin@nexostock.local');
        expect(me.businessId).toBe(session.user.businessId);
        expect(me.businessPrimaryColor).toBe('#0F766E');
        expect(me.businessLogoUrl).toBeNull();
        expect(me.roles).toEqual(['OWNER']);
      });
  });

  it('lists users only within the same business', async () => {
    const otherBusiness = await prisma.business.create({
      data: {
        name: 'E2E Other Business',
        isActive: true,
      },
    });

    const otherAdminRole = await prisma.role.create({
      data: {
        businessId: otherBusiness.id,
        code: RoleCode.OWNER,
        name: 'Administrator',
        isSystem: true,
      },
    });

    const passwordHash = await bcrypt.hash('OtherBiz123!', 10);
    const otherUser = await prisma.user.create({
      data: {
        email: `other-biz-${Date.now()}@nexostock.local`,
        passwordHash,
        businessId: otherBusiness.id,
        detail: {
          create: {
            firstName: 'Other',
            lastName: 'User',
          },
        },
      },
    });

    await prisma.userRole.create({
      data: {
        userId: otherUser.id,
        roleId: otherAdminRole.id,
        businessId: otherBusiness.id,
      },
    });

    try {
      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@nexostock.local',
          password: 'Admin123!',
        })
        .expect(200);

      const session = readBody<LoginBody>(login);
      const listRes = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      const emails = readBody<UserListBody[]>(listRes).map((user) => user.email);
      expect(emails).toContain('admin@nexostock.local');
      expect(emails).not.toContain(otherUser.email);

      await request(app.getHttpServer())
        .get(`/api/users/${otherUser.id}`)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(404);
    } finally {
      await prisma.user
        .delete({ where: { id: otherUser.id } })
        .catch(() => undefined);
      await prisma.role
        .delete({ where: { id: otherAdminRole.id } })
        .catch(() => undefined);
      await prisma.business
        .delete({ where: { id: otherBusiness.id } })
        .catch(() => undefined);
    }
  });

  it('PATCH /api/business/me sets identity and rejects bad values', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@nexostock.local',
        password: 'Admin123!',
      })
      .expect(200);

    const session = readBody<LoginBody>(login);
    const token = session.accessToken;
    const businessId = session.user.businessId;

    try {
      const updated = await request(app.getHttpServer())
        .patch('/api/business/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          primaryColor: '#aabbcc',
          logoUrl: 'https://cdn.example.com/logo.png',
        })
        .expect(200);

      const updatedBody = readBody<BusinessBody>(updated);
      expect(updatedBody.primaryColor).toBe('#AABBCC');
      expect(updatedBody.logoUrl).toBe('https://cdn.example.com/logo.png');
      expect(updatedBody.isActive).toBe(true);

      const me = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const meBody = readBody<MeBody>(me);
      expect(meBody.businessPrimaryColor).toBe('#AABBCC');
      expect(meBody.businessLogoUrl).toBe('https://cdn.example.com/logo.png');

      await request(app.getHttpServer())
        .patch('/api/business/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ primaryColor: 'blue' })
        .expect(400);

      await request(app.getHttpServer())
        .patch('/api/business/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ logoUrl: 'not-a-url' })
        .expect(400);

      await request(app.getHttpServer())
        .patch('/api/business/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })
        .expect(400);

      const cleared = await request(app.getHttpServer())
        .patch('/api/business/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ primaryColor: null, logoUrl: null })
        .expect(200);

      const clearedBody = readBody<BusinessBody>(cleared);
      expect(clearedBody.primaryColor).toBeNull();
      expect(clearedBody.logoUrl).toBeNull();
      expect(clearedBody.isActive).toBe(true);
    } finally {
      await prisma.business.update({
        where: { id: businessId },
        data: { primaryColor: '#0F766E', logoUrl: null, isActive: true },
      });
    }
  });

  it('rejects assigning a role from another business', async () => {
    const otherBusiness = await prisma.business.create({
      data: { name: 'E2E Foreign Roles', isActive: true },
    });
    const foreignRole = await prisma.role.create({
      data: {
        businessId: otherBusiness.id,
        code: 'FOREIGN_ROLE',
        name: 'Foreign role',
        isSystem: false,
      },
    });

    try {
      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@nexostock.local',
          password: 'Admin123!',
        })
        .expect(200);

      const session = readBody<LoginBody>(login);
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({
          email: `cross-${Date.now()}@nexostock.local`,
          password: 'SecurePass1!',
          firstName: 'Cross',
          lastName: 'Role',
          roleId: foreignRole.id,
        })
        .expect(404);
    } finally {
      await prisma.role
        .delete({ where: { id: foreignRole.id } })
        .catch(() => undefined);
      await prisma.business
        .delete({ where: { id: otherBusiness.id } })
        .catch(() => undefined);
    }
  });

  it('seeds three system roles and one role per user', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@nexostock.local', password: 'Admin123!' })
      .expect(200);
    const session = readBody<LoginBody>(login);
    const token = session.accessToken;

    const rolesRes = await request(app.getHttpServer())
      .get('/api/roles')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const roles = readBody<RoleBody[]>(rolesRes);
    const codes = roles.map((role) => role.code);
    expect(codes).toEqual(
      expect.arrayContaining(['OWNER', 'INVENTORY_ADMIN', 'SALES_EMPLOYEE']),
    );

    const sales = roles.find((role) => role.code === 'SALES_EMPLOYEE');
    const inventory = roles.find((role) => role.code === 'INVENTORY_ADMIN');
    if (!sales || !inventory) {
      throw new Error('system roles missing');
    }

    await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: `norole-${Date.now()}@nexostock.local`,
        password: 'SecurePass1!',
        firstName: 'No',
        lastName: 'Role',
      })
      .expect(400);

    const created = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: `one-role-${Date.now()}@nexostock.local`,
        password: 'SecurePass1!',
        firstName: 'One',
        lastName: 'Role',
        roleId: sales.id,
      })
      .expect(201);
    const createdUser = readBody<UserWriteBody>(created);
    expect(createdUser.roleCode).toBe('SALES_EMPLOYEE');

    await expect(
      prisma.userRole.create({
        data: {
          userId: createdUser.id,
          roleId: inventory.id,
          businessId: session.user.businessId,
        },
      }),
    ).rejects.toThrow();

    await prisma.user.delete({ where: { id: createdUser.id } });
  });

  it('forbids deactivating yourself or changing your own role', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@nexostock.local', password: 'Admin123!' })
      .expect(200);
    const session = readBody<LoginBody>(login);
    const token = session.accessToken;
    const ownerId = session.user.id;
    const rolesRes = await request(app.getHttpServer())
      .get('/api/roles')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const sales = readBody<RoleBody[]>(rolesRes).find(
      (role) => role.code === 'SALES_EMPLOYEE',
    );
    if (!sales) {
      throw new Error('sales role missing');
    }

    await request(app.getHttpServer())
      .patch(`/api/users/${ownerId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: false })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/users/${ownerId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ roleId: sales.id })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/users/${ownerId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'AnotherPass1' })
      .expect(403);
  });

  it('returns 403 for an inactive user with the correct password', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@nexostock.local', password: 'Admin123!' })
      .expect(200);
    const session = readBody<LoginBody>(login);
    const token = session.accessToken;
    const rolesRes = await request(app.getHttpServer())
      .get('/api/roles')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const sales = readBody<RoleBody[]>(rolesRes).find(
      (role) => role.code === 'SALES_EMPLOYEE',
    );
    if (!sales) {
      throw new Error('sales role missing');
    }
    const email = `inactive-${Date.now()}@nexostock.local`;

    const created = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email,
        password: 'SecurePass1!',
        firstName: 'In',
        lastName: 'Active',
        roleId: sales.id,
      })
      .expect(201);
    const createdUser = readBody<UserWriteBody>(created);

    await request(app.getHttpServer())
      .patch(`/api/users/${createdUser.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: false })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'SecurePass1!' })
      .expect(403)
      .expect((res) => {
        expect(readBody<ErrorBody>(res).message).toBe('El usuario está inactivo');
        expect(readBody<ErrorBody>(res).code).toBe('USER_INACTIVE');
      });

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);

    await prisma.user.delete({ where: { id: createdUser.id } });
  });

  it('returns 403 when the business is inactive and the password is correct', async () => {
    const businessId = (
      await prisma.user.findUnique({
        where: { email: 'admin@nexostock.local' },
      })
    )?.businessId;
    if (!businessId) {
      throw new Error('admin business missing');
    }

    await prisma.business.update({
      where: { id: businessId },
      data: { isActive: false },
    });

    try {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@nexostock.local', password: 'Admin123!' })
        .expect(403)
        .expect((res) => {
          expect(readBody<ErrorBody>(res).message).toBe('El negocio está inactivo');
        });
    } finally {
      await prisma.business.update({
        where: { id: businessId },
        data: { isActive: true },
      });
    }
  });

  it('revokes refresh tokens when the role changes', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@nexostock.local', password: 'Admin123!' })
      .expect(200);
    const session = readBody<LoginBody>(login);
    const token = session.accessToken;
    const rolesRes = await request(app.getHttpServer())
      .get('/api/roles')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const roles = readBody<RoleBody[]>(rolesRes);
    const sales = roles.find((role) => role.code === 'SALES_EMPLOYEE');
    const inventory = roles.find((role) => role.code === 'INVENTORY_ADMIN');
    if (!sales || !inventory) {
      throw new Error('system roles missing');
    }
    const email = `switch-${Date.now()}@nexostock.local`;

    const created = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email,
        password: 'SecurePass1!',
        firstName: 'Role',
        lastName: 'Switch',
        roleId: inventory.id,
      })
      .expect(201);
    const createdUser = readBody<UserWriteBody>(created);

    const userLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'SecurePass1!' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/users/${createdUser.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ roleId: sales.id })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: readBody<LoginBody>(userLogin).refreshToken })
      .expect(401);

    await prisma.user.delete({ where: { id: createdUser.id } });
  });
});
