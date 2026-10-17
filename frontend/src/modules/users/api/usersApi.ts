import { http } from '@/shared/api';
import type {
  CreateRolePayload,
  CreateUserPayload,
  PermissionCatalogItem,
  RoleDetail,
  RoleListItem,
  UpdateRolePayload,
  UpdateUserPayload,
  UserDetail,
  UserListItem,
} from '../types';

export const usersApi = {
  async list(): Promise<UserListItem[]> {
    const { data } = await http.get<UserListItem[]>('/users');
    return data;
  },

  async get(id: string): Promise<UserDetail> {
    const { data } = await http.get<UserDetail>(`/users/${encodeURIComponent(id)}`);
    return data;
  },

  async create(payload: CreateUserPayload): Promise<UserDetail> {
    const { data } = await http.post<UserDetail>('/users', payload);
    return data;
  },

  async update(id: string, payload: UpdateUserPayload): Promise<UserDetail> {
    const { data } = await http.patch<UserDetail>(`/users/${encodeURIComponent(id)}`, payload);
    return data;
  },
};

export const rolesApi = {
  async list(): Promise<RoleListItem[]> {
    const { data } = await http.get<RoleListItem[]>('/roles');
    return data;
  },

  async get(id: string): Promise<RoleDetail> {
    const { data } = await http.get<RoleDetail>(`/roles/${encodeURIComponent(id)}`);
    return data;
  },

  async create(payload: CreateRolePayload): Promise<RoleDetail> {
    const { data } = await http.post<RoleDetail>('/roles', payload);
    return data;
  },

  async update(id: string, payload: UpdateRolePayload): Promise<RoleDetail> {
    const { data } = await http.patch<RoleDetail>(`/roles/${encodeURIComponent(id)}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await http.delete(`/roles/${encodeURIComponent(id)}`);
  },
};

export const catalogApi = {
  async permissions(): Promise<PermissionCatalogItem[]> {
    const { data } = await http.get<PermissionCatalogItem[]>('/permissions');
    return data;
  },
};
