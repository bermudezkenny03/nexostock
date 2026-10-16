import { UnauthorizedException } from '@nestjs/common';
import { isJwtPayload, parseJwtPayload } from './identity';
import { addMoney, multiplyMoney } from './money';
import { internalKeysMatch } from './security';

describe('identity contract', () => {
  const payload = {
    sub: 'user-1',
    email: 'owner@shop.test',
    businessId: 'biz-1',
    roles: ['OWNER'],
    permissions: ['products.view'],
  };

  it('accepts the access token claims used by auth-service', () => {
    expect(isJwtPayload(payload)).toBe(true);
    expect(parseJwtPayload(payload)).toEqual(payload);
  });

  it('rejects a token without businessId', () => {
    const { businessId: _ignored, ...rest } = payload;
    expect(isJwtPayload(rest)).toBe(false);
    expect(() => parseJwtPayload(rest)).toThrow(UnauthorizedException);
  });
});

describe('money', () => {
  it('multiplies and adds decimal prices in cents', () => {
    expect(multiplyMoney('10.50', 3)).toBe('31.50');
    expect(addMoney(['10.50', '0.05', '1.00'])).toBe('11.55');
  });

  it('rejects prices with more than two decimals', () => {
    expect(() => multiplyMoney('1.999', 1)).toThrow('Invalid money value');
  });
});

describe('internalKeysMatch', () => {
  it('requires the same key and ignores length mismatches', () => {
    expect(internalKeysMatch('local-dev-internal-key', 'local-dev-internal-key')).toBe(
      true,
    );
    expect(internalKeysMatch('short', 'local-dev-internal-key')).toBe(false);
    expect(internalKeysMatch(undefined, 'local-dev-internal-key')).toBe(false);
  });
});
