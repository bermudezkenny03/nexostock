import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import {
  Permission,
  PLATFORM_BUSINESS_ID,
} from '../common/rbac/permission.constants';
import { PlatformGuard } from './platform.guard';

const STORE_ID = '11111111-1111-4111-8111-111111111111';

function contextWith(
  user: { businessId: string; permissions: string[] } | undefined,
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('PlatformGuard', () => {
  const guard = new PlatformGuard();

  it('allows the provider business with platform.manage', () => {
    const context = contextWith({
      businessId: PLATFORM_BUSINESS_ID,
      permissions: [Permission.PLATFORM_MANAGE],
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects platform.manage outside the provider business', () => {
    const context = contextWith({
      businessId: STORE_ID,
      permissions: [Permission.PLATFORM_MANAGE],
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rejects the provider business without platform.manage', () => {
    const context = contextWith({
      businessId: PLATFORM_BUSINESS_ID,
      permissions: [Permission.USERS_MANAGE],
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rejects a request without a user', () => {
    expect(() => guard.canActivate(contextWith(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
