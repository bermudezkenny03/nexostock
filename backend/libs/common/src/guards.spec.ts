import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './security';

function contextWith(permissions: string[] | undefined): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({ user: permissions ? { permissions } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);

  afterEach(() => jest.restoreAllMocks());

  it('allows routes that do not declare permissions', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(contextWith(undefined))).toBe(true);
  });

  it('allows any one of the declared permissions', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['products.manage', 'products.view']);
    expect(guard.canActivate(contextWith(['products.view']))).toBe(true);
  });

  it('rejects a caller without those permissions', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['sales.manage']);
    expect(() => guard.canActivate(contextWith(['products.view']))).toThrow(
      ForbiddenException,
    );
  });
});
