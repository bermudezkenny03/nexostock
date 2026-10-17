<script setup lang="ts">
import Button from 'primevue/button';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Toolbar from 'primevue/toolbar';
import { computed, ref } from 'vue';
import { describeApiError } from '@/shared/api';
import { useConfirmAction } from '@/shared/composables/useConfirmAction';
import { useNotify } from '@/shared/composables/useNotify';
import AppDataTable from '@/shared/ui/AppDataTable.vue';
import AppSearchFilter from '@/shared/ui/AppSearchFilter.vue';
import { formatInteger } from '@/shared/utils/format';
import RoleFormDialog from '../components/RoleFormDialog.vue';
import { useDeleteRole, useRoles } from '../composables/useUsers';
import type { RoleListItem } from '../types';

const notify = useNotify();
const confirm = useConfirmAction();
const roles = useRoles();
const deleteRole = useDeleteRole();
const search = ref('');
const dialogVisible = ref(false);
const editing = ref<RoleListItem | null>(null);

const filtered = computed(() => {
  const term = search.value.toLocaleLowerCase('es');
  const all = roles.data.value ?? [];
  if (!term) {
    return all;
  }
  return all.filter((role) => [role.name, role.code, role.description].some((value) => value?.toLocaleLowerCase('es').includes(term)));
});

const listError = computed(() => (roles.error.value ? describeApiError(roles.error.value) : null));

function openCreate(): void {
  editing.value = null;
  dialogVisible.value = true;
}

function openEdit(role: RoleListItem): void {
  editing.value = role;
  dialogVisible.value = true;
}

function deleteHint(role: RoleListItem): string {
  if (role.isSystem) {
    return 'Los roles de sistema no se eliminan';
  }
  if (role.userCount > 0) {
    return 'Reasigna sus usuarios antes de eliminarlo';
  }
  return 'Eliminar';
}

async function onDelete(role: RoleListItem): Promise<void> {
  if (role.isSystem) {
    notify.warn('Los roles de sistema no se pueden eliminar', role.name);
    return;
  }
  if (role.userCount > 0) {
    notify.warn('Este rol todavía tiene usuarios', `${role.name} lo tienen ${formatInteger(role.userCount)}. Reasígnalos antes de eliminarlo.`);
    return;
  }
  const accepted = await confirm({
    title: 'Eliminar rol',
    message: `Se eliminará "${role.name}". Solo es posible si ningún usuario lo tiene asignado.`,
    acceptLabel: 'Eliminar',
    danger: true,
  });
  if (!accepted) {
    return;
  }
  try {
    await deleteRole.mutateAsync(role.id);
    notify.success('Rol eliminado', role.name);
  } catch (error) {
    notify.error(error);
  }
}
</script>

<template>
  <div>
    <div class="card">
      <h4 class="m-0 mb-4">Roles</h4>
      <Toolbar class="mb-6">
        <template #start>
          <Button label="Nuevo rol" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openCreate" />
        </template>
        <template #end>
          <AppSearchFilter v-model="search" placeholder="Buscar..." label="Buscar roles" :debounce-ms="150" />
        </template>
      </Toolbar>

      <AppDataTable
        :value="filtered"
        data-key="id"
        :loading="roles.isFetching.value"
        :error="listError"
        table-label="Listado de roles"
        :empty-title="search ? 'Sin coincidencias' : 'Aún no hay roles'"
        @retry="roles.refetch()"
      >
        <Column field="name" header="Nombre" sortable style="min-width: 12rem" />
        <Column field="code" header="Código" style="min-width: 10rem">
          <template #body="{ data }"><span class="font-mono text-sm">{{ data.code }}</span></template>
        </Column>
        <Column header="Tipo" style="min-width: 8rem">
          <template #body="{ data }">
            <Tag :value="data.isSystem ? 'Sistema' : 'Personalizado'" :severity="data.isSystem ? 'secondary' : 'info'" />
          </template>
        </Column>
        <Column header="Usuarios" style="min-width: 7rem">
          <template #body="{ data }">{{ formatInteger(data.userCount) }}</template>
        </Column>
        <Column header="Permisos" style="min-width: 8rem">
          <template #body="{ data }">{{ formatInteger(data.permissionCodes.length) }}</template>
        </Column>
        <Column :exportable="false" style="min-width: 10rem">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" text rounded severity="secondary" :aria-label="`Editar ${data.name}`" @click="openEdit(data)" />
            <Button
              v-tooltip.top="deleteHint(data)"
              icon="pi pi-trash"
              text
              rounded
              severity="danger"
              :aria-label="`Eliminar ${data.name}`"
              @click="onDelete(data)"
            />
          </template>
        </Column>
        <template #empty-actions>
          <Button v-if="!search" label="Nuevo rol" icon="pi pi-plus" @click="openCreate" />
        </template>
      </AppDataTable>
    </div>

    <RoleFormDialog v-model:visible="dialogVisible" :role="editing" />
  </div>
</template>
