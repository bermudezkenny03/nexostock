import { forwardedHeaders, resolveRequestId } from './headers';

describe('gateway headers', () => {
  it('drops identity and internal headers supplied by the client', () => {
    const headers = forwardedHeaders(
      {
        authorization: 'Bearer token',
        'x-internal-key': 'stolen',
        'x-business-id': 'other-business',
        'x-user-id': 'other-user',
        'x-forwarded-for': '1.2.3.4',
        host: 'gateway.local',
      },
      '11111111-1111-4111-8111-111111111111',
      '10.0.0.8',
    );

    expect(headers.authorization).toBe('Bearer token');
    expect(headers['x-internal-key']).toBeUndefined();
    expect(headers['x-business-id']).toBeUndefined();
    expect(headers['x-user-id']).toBeUndefined();
    expect(headers['x-forwarded-for']).toBe('10.0.0.8');
    expect(headers['x-request-id']).toBe('11111111-1111-4111-8111-111111111111');
    expect(headers.host).toBeUndefined();
  });

  it('keeps a client request id only when it is a UUID', () => {
    expect(resolveRequestId('not-a-uuid')).not.toBe('not-a-uuid');
    expect(resolveRequestId('11111111-1111-4111-8111-111111111111')).toBe(
      '11111111-1111-4111-8111-111111111111',
    );
  });
});
