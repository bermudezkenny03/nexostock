import { UnauthorizedException } from '@nestjs/common';

export interface JwtPayload {
  sub: string;
  email: string;
  businessId: string;
  roles: string[];
  permissions: string[];
}

export function isJwtPayload(payload: unknown): payload is JwtPayload {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const record = payload as Record<string, unknown>;
  const { sub, email, businessId, roles, permissions } = record;

  return (
    typeof sub === 'string' &&
    typeof email === 'string' &&
    typeof businessId === 'string' &&
    Array.isArray(roles) &&
    roles.every((item): item is string => typeof item === 'string') &&
    Array.isArray(permissions) &&
    permissions.every((item): item is string => typeof item === 'string')
  );
}

export function parseJwtPayload(payload: unknown): JwtPayload {
  if (!isJwtPayload(payload)) {
    throw new UnauthorizedException({
      message: 'Token inválido',
      code: 'UNAUTHENTICATED',
    });
  }

  return payload;
}

export const Permission = {
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_MANAGE: 'products.manage',
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_MANAGE: 'inventory.manage',
  SALES_VIEW: 'sales.view',
  SALES_MANAGE: 'sales.manage',
  REPORTS_VIEW: 'reports.view',
  REPORTS_MANAGE: 'reports.manage',
} as const;

export type PermissionCode = (typeof Permission)[keyof typeof Permission];

export function hasPermission(
  permissions: readonly string[],
  code: string,
): boolean {
  return permissions.includes(code);
}
