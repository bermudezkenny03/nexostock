import type { INestApplication } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createGateway } from '../src/create-gateway';

process.env.JWT_SECRET = 'test-secret-test-secret';
process.env.JWT_ISSUER = 'nexostock-auth';
process.env.JWT_AUDIENCE = 'nexostock-api';
process.env.INTERNAL_API_KEY = 'local-dev-internal-key';
process.env.UPSTREAM_TIMEOUT_MS = '300';
process.env.PROXY_TIMEOUT_MS = '300';
process.env.AUTH_SERVICE_URL = 'http://127.0.0.1:9';
process.env.PRODUCTS_SERVICE_URL = 'http://127.0.0.1:9';
process.env.INVENTORY_SERVICE_URL = 'http://127.0.0.1:9';
process.env.SALES_SERVICE_URL = 'http://127.0.0.1:9';
process.env.REPORTS_SERVICE_URL = 'http://127.0.0.1:9';
process.env.NODE_ENV = 'test';

function accessToken(): string {
  return jwt.sign(
    {
      sub: '6d9f4c2e-6b1a-4f0e-9c2a-1b7e5d4a3301',
      email: 'owner@shop.test',
      businessId: '6d9f4c2e-6b1a-4f0e-9c2a-1b7e5d4a3302',
      roles: ['OWNER'],
      permissions: ['products.view'],
    },
    process.env.JWT_SECRET ?? '',
    {
      algorithm: 'HS256',
      issuer: 'nexostock-auth',
      audience: 'nexostock-api',
      expiresIn: '5m',
    },
  );
}

describe('API gateway', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createGateway();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports upstream health without a token', async () => {
    const response = await request(app.getHttpServer()).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.service).toBe('api-gateway');
    expect(response.body.upstreams.products).toBe('down');
    expect(response.headers['access-control-expose-headers']).toBeUndefined();
  });

  it('rejects a protected route without a token', async () => {
    const response = await request(app.getHttpServer()).get('/api/products');
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('UNAUTHENTICATED');
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
  });

  it('hides internal routes', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/internal/stock/deduct')
      .set('x-internal-key', 'local-dev-internal-key');
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('ROUTE_NOT_FOUND');
  });

  it('returns 503 when the upstream is down and keeps the client request id', async () => {
    const requestId = '11111111-1111-4111-8111-111111111111';
    const response = await request(app.getHttpServer())
      .get('/api/products')
      .set('Authorization', `Bearer ${accessToken()}`)
      .set('X-Request-Id', requestId)
      .set('X-Internal-Key', 'stolen');

    expect(response.status).toBe(503);
    expect(response.body.code).toBe('UPSTREAM_UNAVAILABLE');
    expect(response.headers['x-request-id']).toBe(requestId);
  });
});
