import {
  applyPlan,
  BUSINESS_PERMISSION_CODES,
  isPlatformPermission,
  isPrivilegedRole,
  Permission,
  PLAN_PERMISSIONS,
  planConfigurationErrors,
  PLATFORM_BUSINESS_ID,
  PLATFORM_PERMISSION_CODES,
  PLATFORM_ROLE_PERMISSIONS,
  PlanCode,
  permissionsAllowedByPlan,
  RoleCode,
} from './permission.constants';

const STORE_ID = '11111111-1111-4111-8111-111111111111';

describe('plan permissions', () => {
  it('only grants store permissions in every plan', () => {
    for (const codes of Object.values(PLAN_PERMISSIONS)) {
      for (const code of codes) {
        expect(BUSINESS_PERMISSION_CODES).toContain(code);
        expect(isPlatformPermission(code)).toBe(false);
      }
    }
  });

  it('makes every plan include the one below it', () => {
    const free = PLAN_PERMISSIONS.FREE;
    const basic = PLAN_PERMISSIONS.BASIC;
    expect(basic).toEqual(expect.arrayContaining([...free]));
    expect(PLAN_PERMISSIONS.PRO).toEqual(expect.arrayContaining([...basic]));
    expect([...PLAN_PERMISSIONS.PRO].sort()).toEqual(
      [...BUSINESS_PERMISSION_CODES].sort(),
    );
  });

  it('falls back to the free plan for an unknown plan', () => {
    expect(permissionsAllowedByPlan('UNKNOWN')).toEqual(PLAN_PERMISSIONS.FREE);
  });

  it('removes what the plan does not allow from a store', () => {
    const effective = applyPlan(STORE_ID, PlanCode.FREE, [
      Permission.PRODUCTS_MANAGE,
      Permission.REPORTS_VIEW,
      Permission.ROLES_MANAGE,
    ]);
    expect(effective).toEqual([Permission.PRODUCTS_MANAGE]);
  });

  it('never filters the provider business', () => {
    const permissions = PLATFORM_ROLE_PERMISSIONS.SUPER_ADMIN ?? [];
    expect(applyPlan(PLATFORM_BUSINESS_ID, PlanCode.FREE, permissions)).toEqual(
      [...permissions],
    );
  });
});

describe('planConfigurationErrors', () => {
  it('accepts plans that match the configuration', () => {
    expect(planConfigurationErrors(Object.keys(PLAN_PERMISSIONS))).toEqual([]);
  });

  it('reports plans missing on either side', () => {
    const errors = planConfigurationErrors(['FREE', 'BASIC', 'ENTERPRISE']);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain('ENTERPRISE');
    expect(errors[1]).toContain('PRO');
  });
});

describe('roles', () => {
  it('treats only OWNER and SUPER_ADMIN as privileged', () => {
    expect(isPrivilegedRole(RoleCode.OWNER)).toBe(true);
    expect(isPrivilegedRole(RoleCode.SUPER_ADMIN)).toBe(true);
    expect(isPrivilegedRole(RoleCode.SALES_EMPLOYEE)).toBe(false);
    expect(isPrivilegedRole(null)).toBe(false);
    expect(isPrivilegedRole(undefined)).toBe(false);
  });

  it('gives SUPER_ADMIN the platform permission and no store operations', () => {
    const permissions = PLATFORM_ROLE_PERMISSIONS.SUPER_ADMIN ?? [];
    expect(permissions).toEqual(
      expect.arrayContaining([...PLATFORM_PERMISSION_CODES]),
    );
    expect(permissions).not.toContain(Permission.SALES_MANAGE);
    expect(permissions).not.toContain(Permission.PRODUCTS_MANAGE);
  });
});
