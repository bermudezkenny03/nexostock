<script setup lang="ts">
import Button from 'primevue/button';
import Column from 'primevue/column';
import Toolbar from 'primevue/toolbar';
import { computed, ref } from 'vue';
import { describeApiError } from '@/shared/api';
import { useConfirmAction } from '@/shared/composables/useConfirmAction';
import { useNotify } from '@/shared/composables/useNotify';
import AppDataTable from '@/shared/ui/AppDataTable.vue';
import AppSearchFilter from '@/shared/ui/AppSearchFilter.vue';
import AppStatusBadge from '@/shared/ui/AppStatusBadge.vue';
import { displayName, formatDateTime } from '@/shared/utils/format';
import UserFormDialog from '../components/UserFormDialog.vue';
import { useUpdateUser, useUserList } from '../composables/useUsers';
import type { UserListItem } from '../types';

const notify = useNotify();
const confirm = useConfirmAction();
const users = useUserList();
const updateUser = useUpdateUser();
const search = ref('');
const dialogVisible = ref(false);
const editing = ref<UserListItem | null>(null);
const togglingId = ref<string | null>(null);

const filtered = computed(() => {
  const term = search.value.toLocaleLowerCase('es');
  const all = users.data.value ?? [];
  if (!term) {
    return all;
  }
  return all.filter((user) =>
    [user.email, user.firstName, user.lastName, user.roleName].some((value) => value?.toLocaleLowerCase('es').includes(term)),
  );
});

const listError = computed(() => (users.error.value ? describeApiError(users.error.value) : null));

function openCreate(): void {
  editing.value = null;
  dialogVisible.value = true;
}

function openEdit(user: UserListItem): void {
  editing.value = user;
  dialogVisible.value = true;
}

async function toggleActive(user: UserListItem): Promise<void> {
  const activate = !user.isActive;
  const accepted = await confirm({
    title: activate ? 'Activar usuario' : 'Desactivar usuario',
    message: activate
      ? `${displayName(user.firstName, user.lastName, user.email)} volverá a poder iniciar sesión.`
      : `${displayName(user.firstName, user.lastName, user.email)} dejará de poder iniciar sesión.`,
    acceptLabel: activate ? 'Activar' : 'Desactivar',
    danger: !activate,
  });
  if (!accepted) {
    return;
  }
  togglingId.value = user.id;
  try {
    await updateUser.mutateAsync({ id: user.id, payload: { isActive: activate } });
    notify.success(activate ? 'Usuario activado' : 'Usuario desactivado', user.email);
  } catch (error) {
    notify.error(error);
  } finally {
    togglingId.value = null;
  }
}
</script>

<template>
  <div>
    <div class="card">
      <h4 class="m-0 mb-4">Usuarios</h4>
      <Toolbar class="mb-6">
        <template #start>
          <Button label="Nuevo usuario" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openCreate" />
        </template>
        <template #end>
          <AppSearchFilter v-model="search" placeholder="Buscar..." label="Buscar usuarios" :debounce-ms="150" />
        </template>
      </Toolbar>

      <AppDataTable
        :value="filtered"
        data-key="id"
        :loading="users.isFetching.value"
        :error="listError"
        table-label="Listado de usuarios"
        :empty-title="search ? 'Sin coincidencias' : 'Aún no hay usuarios'"
        @retry="users.refetch()"
      >
        <Column header="Nombre" style="min-width: 12rem">
          <template #body="{ data }">{{ displayName(data.firstName, data.lastName, data.email) }}</template>
        </Column>
        <Column field="email" header="Correo" style="min-width: 14rem" />
        <Column header="Rol" style="min-width: 10rem">
          <template #body="{ data }">{{ data.roleName ?? '—' }}</template>
        </Column>
        <Column header="Estado" style="min-width: 8rem">
          <template #body="{ data }"><AppStatusBadge :status="data.isActive" /></template>
        </Column>
        <Column header="Último acceso" style="min-width: 10rem">
          <template #body="{ data }">{{ formatDateTime(data.lastLoginAt) }}</template>
        </Column>
        <Column :exportable="false" style="min-width: 10rem">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" text rounded severity="secondary" :aria-label="`Editar ${data.email}`" @click="openEdit(data)" />
            <Button
              :icon="data.isActive ? 'pi pi-ban' : 'pi pi-check-circle'"
              text
              rounded
              :severity="data.isActive ? 'danger' : 'success'"
              :loading="togglingId === data.id"
              :aria-label="`${data.isActive ? 'Desactivar' : 'Activar'} ${data.email}`"
              @click="toggleActive(data)"
            />
          </template>
        </Column>
        <template #empty-actions>
          <Button v-if="!search" label="Nuevo usuario" icon="pi pi-plus" @click="openCreate" />
        </template>
      </AppDataTable>
    </div>

    <UserFormDialog v-model:visible="dialogVisible" :user="editing" />
  </div>
</template>
