/** Permission codes issued by auth-service (`permission.constants.ts`). */
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

/** Fixed tenant that owns the platform administration panel. */
export const PLATFORM_BUSINESS_ID = '00000000-0000-4000-8000-000000000000';
