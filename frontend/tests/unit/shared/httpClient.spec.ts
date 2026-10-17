import { http as mock, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, configureAuthBridge, createHttpClient, tokenStorage, type AuthBridge } from '@/shared/api';
import { API, server, useMockServer } from '../../utils/server';

useMockServer();

function bridgeWith(refresh: AuthBridge['refresh']) {
  const bridge = {
    refresh: vi.fn(refresh),
    onSessionExpired: vi.fn(),
    onBusinessSuspended: vi.fn(),
  };
  configureAuthBridge(bridge);
  return bridge;
}

/** Accepts only `Bearer valid`; anything else is a 401 like the gateway answers. */
function protectedEndpoint(path: string) {
  return mock.get(`${API}${path}`, ({ request }) =>
    request.headers.get('authorization') === 'Bearer valid'
      ? HttpResponse.json({ ok: true, path })
      : HttpResponse.json({ statusCode: 401, message: 'Token inválido', code: 'UNAUTHENTICATED' }, { status: 401 }),
  );
}

afterEach(() => {
  configureAuthBridge(null);
  tokenStorage.clear();
});

describe('httpClient', () => {
  it('attaches the in-memory access token', async () => {
    server.use(protectedEndpoint('/me'));
    tokenStorage.setTokens({ accessToken: 'valid', refreshToken: 'r1' });

    const { data } = await createHttpClient(API).get('/me');

    expect(data).toEqual({ ok: true, path: '/me' });
  });

  it('shares one refresh between concurrent 401 responses and retries each request once', async () => {
    server.use(protectedEndpoint('/a'), protectedEndpoint('/b'), protectedEndpoint('/c'));
    tokenStorage.setTokens({ accessToken: 'expired', refreshToken: 'r1' });
    const bridge = bridgeWith(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      tokenStorage.setTokens({ accessToken: 'valid', refreshToken: 'r2' });
      return true;
    });
    const client = createHttpClient(API);

    const results = await Promise.all([client.get('/a'), client.get('/b'), client.get('/c')]);

    expect(bridge.refresh).toHaveBeenCalledTimes(1);
    expect(results.map((result) => result.data.path)).toEqual(['/a', '/b', '/c']);
    expect(bridge.onSessionExpired).not.toHaveBeenCalled();
  });

  it('ends the session when the refresh fails', async () => {
    server.use(protectedEndpoint('/a'));
    tokenStorage.setTokens({ accessToken: 'expired', refreshToken: 'r1' });
    const bridge = bridgeWith(async () => false);

    const error = await createHttpClient(API)
      .get('/a')
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect(bridge.onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('does not loop when the retried request is still unauthorized', async () => {
    server.use(protectedEndpoint('/a'));
    tokenStorage.setTokens({ accessToken: 'expired', refreshToken: 'r1' });
    const bridge = bridgeWith(async () => true);

    await expect(createHttpClient(API).get('/a')).rejects.toBeInstanceOf(ApiError);

    expect(bridge.refresh).toHaveBeenCalledTimes(1);
    expect(bridge.onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('never refreshes for public auth requests', async () => {
    server.use(
      mock.post(`${API}/auth/login`, () =>
        HttpResponse.json({ statusCode: 401, message: 'Credenciales inválidas' }, { status: 401 }),
      ),
    );
    const bridge = bridgeWith(async () => true);

    const error = (await createHttpClient(API)
      .post('/auth/login', {}, { skipAuth: true })
      .catch((reason: unknown) => reason)) as ApiError;

    expect(error.message).toBe('Credenciales inválidas');
    expect(bridge.refresh).not.toHaveBeenCalled();
    expect(bridge.onSessionExpired).not.toHaveBeenCalled();
  });

  it('notifies a suspended business', async () => {
    server.use(
      mock.get(`${API}/products`, () =>
        HttpResponse.json(
          { statusCode: 403, message: 'Negocio suspendido', code: 'BUSINESS_SUSPENDED' },
          { status: 403 },
        ),
      ),
    );
    const bridge = bridgeWith(async () => true);

    await expect(createHttpClient(API).get('/products')).rejects.toMatchObject({ code: 'BUSINESS_SUSPENDED' });

    expect(bridge.onBusinessSuspended).toHaveBeenCalledTimes(1);
  });

  it('does not end the session on a plain permission 403', async () => {
    server.use(
      mock.get(`${API}/users`, () => HttpResponse.json({ statusCode: 403, message: 'Forbidden' }, { status: 403 })),
    );
    const bridge = bridgeWith(async () => true);

    await expect(createHttpClient(API).get('/users')).rejects.toMatchObject({ status: 403 });

    expect(bridge.onBusinessSuspended).not.toHaveBeenCalled();
    expect(bridge.onSessionExpired).not.toHaveBeenCalled();
  });
});
