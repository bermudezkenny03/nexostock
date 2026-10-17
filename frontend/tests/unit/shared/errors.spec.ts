import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { ApiError, describeApiError, shouldRetry, toApiError } from '@/shared/api';

function axiosError(status: number, data: unknown): AxiosError {
  const headers = new AxiosHeaders({ 'x-request-id': 'req-1' });
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', { headers }, null, {
    status,
    statusText: '',
    data,
    headers,
    config: { headers },
  });
}

describe('toApiError', () => {
  it('normalizes the backend error body', () => {
    const error = toApiError(
      axiosError(400, { statusCode: 400, message: ['sku must be longer', 'price invalid'], error: 'Bad Request' }),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.message).toBe('sku must be longer');
    expect(error.details).toEqual(['sku must be longer', 'price invalid']);
    expect(error.requestId).toBe('req-1');
  });

  it('marks requests without response as network errors', () => {
    const error = toApiError(new AxiosError('Network Error', 'ERR_NETWORK'));

    expect(error.isNetworkError).toBe(true);
    expect(describeApiError(error)).toMatch(/conectar/);
  });
});

describe('describeApiError', () => {
  it('keeps business-rule messages from the server', () => {
    const error = new ApiError({ status: 403, code: 'PLAN_LIMIT_REACHED', message: 'El plan Gratis permite 50' });

    expect(describeApiError(error)).toBe('El plan Gratis permite 50');
  });

  it('uses a generic message for plain 403 responses', () => {
    expect(describeApiError(new ApiError({ status: 403, message: 'Forbidden resource' }))).toBe(
      'No tienes permiso para realizar esta acción.',
    );
  });
});

describe('shouldRetry', () => {
  it('retries transient failures only', () => {
    expect(shouldRetry(0, new ApiError({ status: 503, message: '' }))).toBe(true);
    expect(shouldRetry(0, new ApiError({ status: 0, message: '' }))).toBe(true);
    expect(shouldRetry(0, new ApiError({ status: 404, message: '' }))).toBe(false);
    expect(shouldRetry(2, new ApiError({ status: 503, message: '' }))).toBe(false);
  });
});
