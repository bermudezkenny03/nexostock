import type { AuthApiSchemas } from '@/shared/api';

type Schemas = AuthApiSchemas['schemas'];

export type UserListItem = Schemas['UserListItemEntity'];
export type UserDetail = Schemas['UserDetailEntity'];
export type CreateUserPayload = Schemas['CreateUserDto'];
export type UpdateUserPayload = Schemas['UpdateUserDto'];
export type RoleListItem = Schemas['RoleListItemEntity'];
export type RoleDetail = Schemas['RoleDetailEntity'];
export type CreateRolePayload = Schemas['CreateRoleDto'];
export type UpdateRolePayload = Schemas['UpdateRoleDto'];
export type PermissionCatalogItem = Schemas['PermissionCatalogItemEntity'];
