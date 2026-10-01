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
} as const;

export type PermissionCode = (typeof Permission)[keyof typeof Permission];

export const RoleCode = {
  OWNER: 'OWNER',
  INVENTORY_ADMIN: 'INVENTORY_ADMIN',
  SALES_EMPLOYEE: 'SALES_EMPLOYEE',
} as const;

export type RoleCodeValue = (typeof RoleCode)[keyof typeof RoleCode];

export const RoleName: Record<RoleCodeValue, string> = {
  OWNER: 'Propietario',
  INVENTORY_ADMIN: 'Administrador de inventario',
  SALES_EMPLOYEE: 'Empleado de ventas',
};

export const ALL_PERMISSION_CODES: readonly PermissionCode[] = [
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

export const ROLE_PERMISSIONS: Record<RoleCodeValue, readonly PermissionCode[]> = {
  OWNER: ALL_PERMISSION_CODES,
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
