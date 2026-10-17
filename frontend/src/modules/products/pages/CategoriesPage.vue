<script setup lang="ts">
import Button from 'primevue/button';
import Column from 'primevue/column';
import Toolbar from 'primevue/toolbar';
import { computed, ref } from 'vue';
import { describeApiError } from '@/shared/api';
import { useConfirmAction } from '@/shared/composables/useConfirmAction';
import { useNotify } from '@/shared/composables/useNotify';
import { usePermissions } from '@/shared/composables/usePermissions';
import { Permission } from '@/shared/constants/permissions';
import AppDataTable from '@/shared/ui/AppDataTable.vue';
import AppPermissionGate from '@/shared/ui/AppPermissionGate.vue';
import AppSearchFilter from '@/shared/ui/AppSearchFilter.vue';
import AppStatusBadge from '@/shared/ui/AppStatusBadge.vue';
import CategoryFormDialog from '../components/CategoryFormDialog.vue';
import { useCategories, useUpdateCategory } from '../composables/useProducts';
import type { Category } from '../types';

const { can } = usePermissions();
const canManage = computed(() => can(Permission.PRODUCTS_MANAGE));
const notify = useNotify();
const confirm = useConfirmAction();

const categories = useCategories();
const updateCategory = useUpdateCategory();
const search = ref('');

// The endpoint returns every category in one response, so filtering is local.
const filtered = computed(() => {
  const term = search.value.toLocaleLowerCase('es');
  const all = categories.data.value ?? [];
  return term ? all.filter((category) => category.name.toLocaleLowerCase('es').includes(term)) : all;
});
const listError = computed(() => (categories.error.value ? describeApiError(categories.error.value) : null));

const dialogVisible = ref(false);
const editing = ref<Category | null>(null);
const togglingId = ref<string | null>(null);

function openCreate(): void {
  editing.value = null;
  dialogVisible.value = true;
}

function openEdit(category: Category): void {
  editing.value = category;
  dialogVisible.value = true;
}

async function toggleActive(category: Category): Promise<void> {
  const activate = !category.isActive;
  const accepted = await confirm({
    title: activate ? 'Activar categoría' : 'Desactivar categoría',
    message: activate
      ? `"${category.name}" volverá a estar disponible al crear productos.`
      : `"${category.name}" no podrá asignarse a nuevos productos. Los productos existentes la conservan.`,
    acceptLabel: activate ? 'Activar' : 'Desactivar',
    danger: !activate,
  });
  if (!accepted) {
    return;
  }
  togglingId.value = category.id;
  try {
    await updateCategory.mutateAsync({ id: category.id, payload: { isActive: activate } });
    notify.success(activate ? 'Categoría activada' : 'Categoría desactivada', category.name);
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
      <h4 class="m-0 mb-4">Categorías</h4>
      <Toolbar class="mb-6">
        <template #start>
          <AppPermissionGate :permissions="Permission.PRODUCTS_MANAGE">
            <Button label="Nueva categoría" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openCreate" />
          </AppPermissionGate>
        </template>
        <template #end>
          <AppSearchFilter v-model="search" placeholder="Buscar..." label="Buscar categorías" :debounce-ms="150" />
        </template>
      </Toolbar>

      <AppDataTable
        :value="filtered"
        data-key="id"
        :loading="categories.isFetching.value"
        :error="listError"
        table-label="Listado de categorías"
        :empty-title="search ? 'Sin coincidencias' : 'Aún no hay categorías'"
        :empty-description="search ? 'Prueba con otro término.' : 'Crea categorías para organizar tu catálogo.'"
        @retry="categories.refetch()"
      >
        <Column field="name" header="Nombre" sortable>
          <template #body="{ data }"><span class="font-medium">{{ data.name }}</span></template>
        </Column>
        <Column header="Descripción">
          <template #body="{ data }">
            <span class="text-muted-color">{{ data.description ?? '—' }}</span>
          </template>
        </Column>
        <Column header="Estado">
          <template #body="{ data }"><AppStatusBadge :status="data.isActive" /></template>
        </Column>
        <Column v-if="canManage" header="Acciones" class="w-32">
          <template #body="{ data }">
            <div class="flex gap-1">
              <Button
                v-tooltip.top="'Editar'"
                icon="pi pi-pencil"
                text
                rounded
                severity="secondary"
                :aria-label="`Editar ${data.name}`"
                @click="openEdit(data)"
              />
              <Button
                v-tooltip.top="data.isActive ? 'Desactivar' : 'Activar'"
                :icon="data.isActive ? 'pi pi-ban' : 'pi pi-check-circle'"
                text
                rounded
                :severity="data.isActive ? 'danger' : 'success'"
                :loading="togglingId === data.id"
                :disabled="togglingId !== null"
                :aria-label="`${data.isActive ? 'Desactivar' : 'Activar'} ${data.name}`"
                @click="toggleActive(data)"
              />
            </div>
          </template>
        </Column>
        <template #empty-actions>
          <Button v-if="!search && canManage" label="Nueva categoría" icon="pi pi-plus" @click="openCreate" />
        </template>
      </AppDataTable>
    </div>

    <CategoryFormDialog v-if="canManage" v-model:visible="dialogVisible" :category="editing" />
  </div>
</template>
