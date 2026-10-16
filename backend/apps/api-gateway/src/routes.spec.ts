import { resolveGatewayRoute } from './routes';

describe('resolveGatewayRoute', () => {
  it('keeps auth public routes on the auth service without a gateway token check', () => {
    expect(resolveGatewayRoute('/api/auth/login')).toMatchObject({
      upstream: 'auth',
      auth: 'delegate',
    });
  });

  it('sends catalog and operations to their services', () => {
    expect(resolveGatewayRoute('/api/products?search=lapiz')?.toString()).not.toBe('null');
    expect(resolveGatewayRoute('/api/products')).toMatchObject({ upstream: 'products' });
    expect(resolveGatewayRoute('/api/inventory/stock')).toMatchObject({ upstream: 'inventory' });
    expect(resolveGatewayRoute('/api/sales')).toMatchObject({ upstream: 'sales' });
    expect(resolveGatewayRoute('/api/reports/overview')).toMatchObject({ upstream: 'reports' });
    expect(resolveGatewayRoute('/api/modules')).toMatchObject({ upstream: 'auth' });
  });

  it('does not treat a longer prefix as a match', () => {
    expect(resolveGatewayRoute('/api/products-extra')).toBeNull();
  });

  it('hides internal routes and unknown paths', () => {
    expect(resolveGatewayRoute('/api/internal/stock/deduct')).toBe('internal');
    expect(resolveGatewayRoute('/api/unknown')).toBeNull();
    expect(resolveGatewayRoute('/api/health')).toBe('local');
  });
});
