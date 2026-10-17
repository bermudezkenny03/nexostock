import { http as mock, HttpResponse } from 'msw';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthBridge, useSessionStore } from '@/modules/auth';
import { configureAuthBridge, tokenStorage } from '@/shared/api';
import { Permission, PLATFORM_BUSINESS_ID } from '@/shared/constants/permissions';
import { API, server, useMockServer } from '../../utils/server';

useMockServer();

const businessUser = {
  id: 'u1',
  email: 'dueno@donpepe.local',
  businessId: '00000000-0000-4000-8000-000000000002',
  businessName: 'Tienda Don Pepe',
  businessPrimaryColor: null,
  businessLogoUrl: null,
  firstName: 'Pepe',
  lastName: null,
  roles: ['OWNER'],
  permissions: [Permission.PRODUCTS_VIEW, Permission.PRODUCTS_MANAGE],
};

const handlers = {
  expired: vi.fn(),
  suspended: vi.fn(),
};

beforeEach(() => {
  setActivePinia(createPinia());
  configureAuthBridge(createAuthBridge({ onSessionExpired: handlers.expired, onBusinessSuspended: handlers.suspended }));
});

afterEach(() => {
  configureAuthBridge(null);
  tokenStorage.clear();
});

describe('session store', () => {
  it('logs in and keeps only the refresh token in sessionStorage', async () => {
    server.use(
      mock.post(`${API}/auth/login`, () =>
        HttpResponse.json({ accessToken: 'a1', refreshToken: 'r1', user: businessUser }),
      ),
    );
    const session = useSessionStore();

    await session.login({ email: businessUser.email, password: 'Demo123!' });

    expect(session.isAuthenticated).toBe(true);
    expect(session.panel).toBe('business');
    expect(session.can(Permission.PRODUCTS_MANAGE)).toBe(true);
    expect(tokenStorage.getAccessToken()).toBe('a1');
    expect(sessionStorage.getItem('nexostock.session.refresh')).toBe('r1');
    expect(JSON.stringify(sessionStorage)).not.toContain('a1');
  });

  it('restores the session by rotating the refresh token', async () => {
    sessionStorage.setItem('nexostock.session.refresh', 'r1');
    const refresh = vi.fn();
    server.use(
      mock.post(`${API}/auth/refresh`, async ({ request }) => {
        refresh(await request.json());
        return HttpResponse.json({ accessToken: 'a2', refreshToken: 'r2' });
      }),
      mock.get(`${API}/auth/me`, ({ request }) =>
        request.headers.get('authorization') === 'Bearer a2'
          ? HttpResponse.json(businessUser)
          : HttpResponse.json({ statusCode: 401, message: 'x' }, { status: 401 }),
      ),
    );
    const session = useSessionStore();

    await Promise.all([session.restore(), session.restore()]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith({ refreshToken: 'r1' });
    expect(session.isAuthenticated).toBe(true);
    expect(sessionStorage.getItem('nexostock.session.refresh')).toBe('r2');
  });

  it('becomes anonymous when the refresh token was revoked', async () => {
    sessionStorage.setItem('nexostock.session.refresh', 'revoked');
    server.use(
      mock.post(`${API}/auth/refresh`, () =>
        HttpResponse.json({ statusCode: 401, message: 'Refresh inválido' }, { status: 401 }),
      ),
    );
    const session = useSessionStore();

    await session.restore();

    expect(session.status).toBe('anonymous');
    expect(sessionStorage.getItem('nexostock.session.refresh')).toBeNull();
  });

  it('is anonymous without calling the API when there is no stored session', async () => {
    const session = useSessionStore();

    await session.restore();

    expect(session.status).toBe('anonymous');
  });

  it('recognizes the platform panel only with platform tenant and permission', async () => {
    server.use(
      mock.post(`${API}/auth/login`, () =>
        HttpResponse.json({
          accessToken: 'a1',
          refreshToken: 'r1',
          user: { ...businessUser, businessId: PLATFORM_BUSINESS_ID, permissions: [Permission.PLATFORM_MANAGE] },
        }),
      ),
    );
    const session = useSessionStore();

    await session.login({ email: 'superadmin@nexostock.local', password: 'x' });

    expect(session.isPlatform).toBe(true);
    expect(session.panel).toBe('platform');
  });

  it('revokes the refresh token on logout and clears local state', async () => {
    const logout = vi.fn();
    server.use(
      mock.post(`${API}/auth/login`, () =>
        HttpResponse.json({ accessToken: 'a1', refreshToken: 'r1', user: businessUser }),
      ),
      mock.post(`${API}/auth/logout`, async ({ request }) => {
        logout(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const session = useSessionStore();
    await session.login({ email: businessUser.email, password: 'x' });

    await session.logout();

    expect(logout).toHaveBeenCalledWith({ refreshToken: 'r1' });
    expect(session.isAuthenticated).toBe(false);
    expect(tokenStorage.getAccessToken()).toBeNull();
  });
});
