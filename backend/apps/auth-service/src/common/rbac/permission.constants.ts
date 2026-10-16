export const PLATFORM_BUSINESS_ID = '00000000-0000-4000-8000-000000000000';
export const PLATFORM_BUSINESS_NAME = 'NexoStock';

export function isPlatformBusiness(businessId: string): boolean {
  return businessId === PLATFORM_BUSINESS_ID;
}

export const PlanCode = {
  FREE: 'FREE',
  BASIC: 'BASIC',
  PRO: 'PRO',
} as const;

export type PlanCodeValue = (typeof PlanCode)[keyof typeof PlanCode];

export const ModuleCode = {
  DASHBOARD: 'dashboard',
  PRODUCTS: 'products',
  INVENTORY: 'inventory',
  SALES: 'sales',
  REPORTS: 'reports',
  ADMINISTRATION: 'administration',
  ADMIN_USERS: 'admin-users',
  ADMIN_ROLES: 'admin-roles',
  ADMIN_BUSINESS: 'admin-business',
  PLATFORM: 'platform',
} as const;

export type ModuleCodeValue = (typeof ModuleCode)[keyof typeof ModuleCode];

export const Permission = {
  DASHBOARD_VIEW: 'dashboard.view',
  DASHBOARD_MANAGE: 'dashboard.manage',
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_MANAGE: 'products.manage',
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_MANAGE: 'inventory.manage',
  SALES_VIEW: 'sales.view',
  SALES_MANAGE: 'sales.manage',
  REPORTS_VIEW: 'reports.view',
  REPORTS_MANAGE: 'reports.manage',
  USERS_MANAGE: 'users.manage',
  ROLES_MANAGE: 'roles.manage',
  BUSINESS_MANAGE: 'business.manage',
  MODULES_VIEW: 'modules.view',
  PLATFORM_MANAGE: 'platform.manage',
} as const;

export type PermissionCode = (typeof Permission)[keyof typeof Permission];

export const RoleCode = {
  OWNER: 'OWNER',
  INVENTORY_ADMIN: 'INVENTORY_ADMIN',
  SALES_EMPLOYEE: 'SALES_EMPLOYEE',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export type RoleCodeValue = (typeof RoleCode)[keyof typeof RoleCode];

export const RoleName: Record<RoleCodeValue, string> = {
  OWNER: 'Propietario',
  INVENTORY_ADMIN: 'Administrador de inventario',
  SALES_EMPLOYEE: 'Empleado de ventas',
  SUPER_ADMIN: 'Superadministrador',
};

export const PRIVILEGED_ROLE_CODES: readonly string[] = [
  RoleCode.OWNER,
  RoleCode.SUPER_ADMIN,
];

export function isPrivilegedRole(code: string | null | undefined): boolean {
  return (
    code !== null && code !== undefined && PRIVILEGED_ROLE_CODES.includes(code)
  );
}

export const BUSINESS_PERMISSION_CODES: readonly PermissionCode[] = [
  Permission.DASHBOARD_VIEW,
  Permission.DASHBOARD_MANAGE,
  Permission.PRODUCTS_VIEW,
  Permission.PRODUCTS_MANAGE,
  Permission.INVENTORY_VIEW,
  Permission.INVENTORY_MANAGE,
  Permission.SALES_VIEW,
  Permission.SALES_MANAGE,
  Permission.REPORTS_VIEW,
  Permission.REPORTS_MANAGE,
  Permission.USERS_MANAGE,
  Permission.ROLES_MANAGE,
  Permission.BUSINESS_MANAGE,
  Permission.MODULES_VIEW,
];

export const PLATFORM_PERMISSION_CODES: readonly PermissionCode[] = [
  Permission.PLATFORM_MANAGE,
];

export function isPlatformPermission(code: string): boolean {
  return (PLATFORM_PERMISSION_CODES as readonly string[]).includes(code);
}

export type SystemRoleMatrix = Partial<
  Record<RoleCodeValue, readonly PermissionCode[]>
>;

export const BUSINESS_ROLE_PERMISSIONS: SystemRoleMatrix = {
  OWNER: BUSINESS_PERMISSION_CODES,
  INVENTORY_ADMIN: [
    Permission.PRODUCTS_VIEW,
    Permission.PRODUCTS_MANAGE,
    Permission.INVENTORY_VIEW,
    Permission.INVENTORY_MANAGE,
  ],
  SALES_EMPLOYEE: [
    Permission.PRODUCTS_VIEW,
    Permission.SALES_VIEW,
    Permission.SALES_MANAGE,
  ],
};

const FREE_PLAN_PERMISSIONS: readonly PermissionCode[] = [
  Permission.PRODUCTS_VIEW,
  Permission.PRODUCTS_MANAGE,
  Permission.INVENTORY_VIEW,
  Permission.INVENTORY_MANAGE,
  Permission.SALES_VIEW,
  Permission.SALES_MANAGE,
  Permission.USERS_MANAGE,
  Permission.BUSINESS_MANAGE,
  Permission.MODULES_VIEW,
];

export const PLAN_PERMISSIONS: Record<
  PlanCodeValue,
  readonly PermissionCode[]
> = {
  FREE: FREE_PLAN_PERMISSIONS,
  BASIC: [
    ...FREE_PLAN_PERMISSIONS,
    Permission.ROLES_MANAGE,
    Permission.DASHBOARD_VIEW,
    Permission.REPORTS_VIEW,
  ],
  PRO: BUSINESS_PERMISSION_CODES,
};

export function planConfigurationErrors(
  databasePlanCodes: readonly string[],
): string[] {
  const configured = Object.keys(PLAN_PERMISSIONS);
  const withoutPermissions = databasePlanCodes.filter(
    (code) => !configured.includes(code),
  );
  const withoutRow = configured.filter(
    (code) => !databasePlanCodes.includes(code),
  );

  const errors: string[] = [];
  if (withoutPermissions.length > 0) {
    errors.push(
      `Plans without PLAN_PERMISSIONS: ${withoutPermissions.join(', ')}.`,
    );
  }
  if (withoutRow.length > 0) {
    errors.push(
      `PLAN_PERMISSIONS without a row in plans: ${withoutRow.join(', ')}.`,
    );
  }
  return errors;
}

export function permissionsAllowedByPlan(
  planCode: string,
): readonly PermissionCode[] {
  return PLAN_PERMISSIONS[planCode as PlanCodeValue] ?? FREE_PLAN_PERMISSIONS;
}

export function applyPlan(
  businessId: string,
  planCode: string,
  permissions: readonly string[],
): string[] {
  if (isPlatformBusiness(businessId)) {
    return [...permissions];
  }
  const allowed = new Set<string>(permissionsAllowedByPlan(planCode));
  return permissions.filter((code) => allowed.has(code));
}

export const PLATFORM_ROLE_PERMISSIONS: SystemRoleMatrix = {
  SUPER_ADMIN: [
    Permission.USERS_MANAGE,
    Permission.ROLES_MANAGE,
    Permission.BUSINESS_MANAGE,
    Permission.MODULES_VIEW,
    Permission.PLATFORM_MANAGE,
  ],
};

export function hasPermission(
  permisos: readonly string[],
  code: PermissionCode | string,
): boolean {
  return permisos.includes(code);
}

export function hasAnyPermission(
  permisos: readonly string[],
  codes: readonly (PermissionCode | string)[],
): boolean {
  return codes.some((code) => permisos.includes(code));
}
