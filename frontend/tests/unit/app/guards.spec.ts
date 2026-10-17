import { describe, expect, it } from 'vitest';
import type { RouteLocationNormalized, RouteMeta } from 'vue-router';
import { resolveAccess, type GuardSession } from '@/app/router/guards';
import { Permission } from '@/shared/constants/permissions';

function route(fullPath: string, meta: RouteMeta = {}): RouteLocationNormalized {
  return { fullPath, meta } as RouteLocationNormalized;
}

function session(overrides: Partial<GuardSession> & { permissions?: string[] } = {}): GuardSession {
  const granted = new Set(overrides.permissions ?? []);
  return {
    isAuthenticated: true,
    panel: 'business',
    can: (codes) => codes.length === 0 || codes.some((code) => granted.has(code)),
    restore: async () => undefined,
    ...overrides,
  };
}

describe('resolveAccess', () => {
  it('sends anonymous users to login keeping the target', () => {
    expect(resolveAccess(route('/app/products'), session({ isAuthenticated: false }))).toEqual({
      name: 'login',
      query: { redirect: '/app/products' },
    });
  });

  it('lets anonymous users reach public routes', () => {
    expect(resolveAccess(route('/login', { public: true, guestOnly: true }), session({ isAuthenticated: false }))).toBe(
      true,
    );
  });

  it('moves authenticated users away from guest-only routes', () => {
    expect(resolveAccess(route('/login', { public: true, guestOnly: true }), session({ panel: 'platform' }))).toEqual({
      name: 'platform-home',
    });
  });

  it('keeps business users out of the platform panel', () => {
    const target = route('/platform', { panel: 'platform', permissions: [Permission.PLATFORM_MANAGE] });

    expect(resolveAccess(target, session())).toEqual({ name: 'dashboard' });
  });

  it('keeps platform users out of the business panel', () => {
    expect(resolveAccess(route('/app/products', { panel: 'business' }), session({ panel: 'platform' }))).toEqual({
      name: 'platform-home',
    });
  });

  it('applies OR semantics to route permissions', () => {
    const target = route('/app/products', {
      panel: 'business',
      permissions: [Permission.PRODUCTS_VIEW, Permission.SALES_VIEW],
    });

    expect(resolveAccess(target, session({ permissions: [Permission.SALES_VIEW] }))).toBe(true);
    expect(resolveAccess(target, session({ permissions: [Permission.INVENTORY_VIEW] }))).toEqual({
      name: 'forbidden',
      query: { from: '/app/products' },
    });
  });
});
