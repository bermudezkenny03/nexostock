import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { catalogApi, rolesApi, usersApi } from '../api/usersApi';
import type { CreateRolePayload, CreateUserPayload, UpdateRolePayload, UpdateUserPayload } from '../types';

export const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};

export const roleKeys = {
  all: ['roles'] as const,
  list: () => [...roleKeys.all, 'list'] as const,
  detail: (id: string) => [...roleKeys.all, 'detail', id] as const,
  permissions: () => ['permissions'] as const,
};

export function useUserList() {
  return useQuery({ queryKey: userKeys.list(), queryFn: usersApi.list });
}

export function useRoles() {
  return useQuery({ queryKey: roleKeys.list(), queryFn: rolesApi.list });
}

export function useRoleDetail(id: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => roleKeys.detail(toValue(id) ?? '')),
    queryFn: () => rolesApi.get(toValue(id)!),
    enabled: computed(() => Boolean(toValue(id))),
  });
}

export function usePermissionCatalog() {
  return useQuery({ queryKey: roleKeys.permissions(), queryFn: catalogApi.permissions });
}

function useInvalidateUsers() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: userKeys.all }),
      client.invalidateQueries({ queryKey: roleKeys.all }),
    ]);
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => usersApi.create(payload),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) => usersApi.update(id, payload),
    onSuccess: () => invalidate(),
  });
}

export function useCreateRole() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (payload: CreateRolePayload) => rolesApi.create(payload),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateRole() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRolePayload }) => rolesApi.update(id, payload),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteRole() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (id: string) => rolesApi.remove(id),
    onSuccess: () => invalidate(),
  });
}
