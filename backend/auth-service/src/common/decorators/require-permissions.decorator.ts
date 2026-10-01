import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '../rbac/permission.constants';

export const REQUIRE_PERMISSIONS_KEY = 'require_permissions';

export type RequiredPermission = PermissionCode | (string & {});

export const RequirePermissions = (...codes: RequiredPermission[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, codes);
