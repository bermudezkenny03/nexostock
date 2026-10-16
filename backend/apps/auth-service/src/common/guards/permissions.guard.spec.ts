import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

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

  it('allows routes without required permissions', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(contextWith(undefined))).toBe(true);
  });

  it('allows when the caller holds any of the required permissions', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['users.manage', 'roles.manage']);
    expect(guard.canActivate(contextWith(['roles.manage']))).toBe(true);
  });

  it('rejects when the caller holds none of them', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['users.manage']);
    expect(() => guard.canActivate(contextWith(['sales.view']))).toThrow(
      ForbiddenException,
    );
  });
});
