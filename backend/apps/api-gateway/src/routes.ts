export type UpstreamName = 'auth' | 'products' | 'inventory' | 'sales' | 'reports';

export interface GatewayRoute {
  prefix: string;
  upstream: UpstreamName;
  auth: 'delegate' | 'required';
}

export const GATEWAY_ROUTES: readonly GatewayRoute[] = [
  { prefix: '/api/auth', upstream: 'auth', auth: 'delegate' },
  { prefix: '/api/platform', upstream: 'auth', auth: 'required' },
  { prefix: '/api/business', upstream: 'auth', auth: 'required' },
  { prefix: '/api/users', upstream: 'auth', auth: 'required' },
  { prefix: '/api/roles', upstream: 'auth', auth: 'required' },
  { prefix: '/api/modules', upstream: 'auth', auth: 'required' },
  { prefix: '/api/permissions', upstream: 'auth', auth: 'required' },
  { prefix: '/api/categories', upstream: 'products', auth: 'required' },
  { prefix: '/api/products', upstream: 'products', auth: 'required' },
  { prefix: '/api/inventory', upstream: 'inventory', auth: 'required' },
  { prefix: '/api/sales', upstream: 'sales', auth: 'required' },
  { prefix: '/api/reports', upstream: 'reports', auth: 'required' },
];

export function resolveGatewayRoute(url: string): GatewayRoute | 'internal' | 'local' | null {
  const pathname = url.split('?')[0];
  if (pathname === '/api/health') {
    return 'local';
  }
  if (pathname === '/api/internal' || pathname.startsWith('/api/internal/')) {
    return 'internal';
  }
  const matches = GATEWAY_ROUTES.filter(
    (route) => pathname === route.prefix || pathname.startsWith(`${route.prefix}/`),
  );
  matches.sort((left, right) => right.prefix.length - left.prefix.length);
  return matches[0] ?? null;
}
