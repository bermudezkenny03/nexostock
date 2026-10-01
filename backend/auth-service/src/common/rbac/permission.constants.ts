export const ModuleCode = {
  DASHBOARD: 'dashboard',
  PRODUCTS: 'products',
  INVENTORY: 'inventory',
  SALES: 'sales',
  REPORTS: 'reports',
  ADMINISTRATION: 'administration',
  ADMIN_USERS: 'admin-users',
  ADMIN_ROLES: 'admin-roles',
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
  MODULES_VIEW: 'modules.view',
} as const;

export type PermissionCode = (typeof Permission)[keyof typeof Permission];

export const RoleCode = {
  ADMIN: 'ADMIN',
  EMPLOYEE: 'EMPLOYEE',
} as const;

export type RoleCodeValue = (typeof RoleCode)[keyof typeof RoleCode];

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
