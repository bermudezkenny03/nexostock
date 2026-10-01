import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { RoleCode } from '../src/common/rbac/permission.constants';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());

const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb('Auth (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = new PrismaClient();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
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
      .expect(201);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
    expect(res.body.user.email).toBe('admin@nexostock.local');
    expect(res.body.user.businessId).toEqual(expect.any(String));
    expect(res.body.user.businessName).toEqual(expect.any(String));
  });

  it('POST /api/auth/refresh and logout', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@nexostock.local',
        password: 'Admin123!',
      })
      .expect(201);

    const oldRefresh = login.body.refreshToken as string;

    const refreshed = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(200);

    expect(refreshed.body.accessToken).toEqual(expect.any(String));
    expect(refreshed.body.refreshToken).toEqual(expect.any(String));
    expect(refreshed.body.refreshToken).not.toBe(oldRefresh);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(401);

    const activeRefresh = refreshed.body.refreshToken as string;

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
        expect(res.body.statusCode).toBe(401);
        expect(res.body.message).toBeDefined();
        expect(res.body.timestamp).toEqual(expect.any(String));
        expect(res.body.path).toContain('/api/auth/login');
      });
  });

  it('GET /api/auth/me with token', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@nexostock.local',
        password: 'Admin123!',
      })
      .expect(201);

    return request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.email).toBe('admin@nexostock.local');
        expect(res.body.businessId).toBe(login.body.user.businessId);
        expect(res.body.roles).toEqual(expect.arrayContaining(['ADMIN']));
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
        code: RoleCode.ADMIN,
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
        userRoles: {
          create: { roleId: otherAdminRole.id },
        },
      },
    });

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@nexostock.local',
        password: 'Admin123!',
      })
      .expect(201);

    const listRes = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    const emails = (listRes.body as Array<{ email: string }>).map((u) => u.email);
    expect(emails).toContain('admin@nexostock.local');
    expect(emails).not.toContain(otherUser.email);

    await request(app.getHttpServer())
      .get(`/api/users/${otherUser.id}`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(404);

    await prisma.user.delete({ where: { id: otherUser.id } });
    await prisma.role.delete({ where: { id: otherAdminRole.id } });
    await prisma.business.delete({ where: { id: otherBusiness.id } });
  });
});
