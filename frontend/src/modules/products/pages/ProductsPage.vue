<script setup lang="ts">
import Button from 'primevue/button';
import Column from 'primevue/column';
import Select from 'primevue/select';
import ToggleSwitch from 'primevue/toggleswitch';
import Toolbar from 'primevue/toolbar';
import { computed, ref, watch } from 'vue';
import { ApiErrorCode, describeApiError, toApiError } from '@/shared/api';
import { useConfirmAction } from '@/shared/composables/useConfirmAction';
import { useNotify } from '@/shared/composables/useNotify';
import { usePagination } from '@/shared/composables/usePagination';
import { usePermissions } from '@/shared/composables/usePermissions';
import { Permission } from '@/shared/constants/permissions';
import AppDataTable from '@/shared/ui/AppDataTable.vue';
import AppPermissionGate from '@/shared/ui/AppPermissionGate.vue';
import AppSearchFilter from '@/shared/ui/AppSearchFilter.vue';
import AppStatusBadge from '@/shared/ui/AppStatusBadge.vue';
import { formatMoney } from '@/shared/utils/format';
import ProductFormDialog from '../components/ProductFormDialog.vue';
import { useCategories, useProductList, useUpdateProduct } from '../composables/useProducts';
import type { Product, ProductListQuery } from '../types';

const { can } = usePermissions();
const canManage = computed(() => can(Permission.PRODUCTS_MANAGE));
const notify = useNotify();
const confirm = useConfirmAction();

const search = ref('');
const categoryId = ref<string | null>(null);
const includeInactive = ref(false);
const pagination = usePagination();

watch([search, categoryId, includeInactive], () => pagination.reset());

const query = computed<ProductListQuery>(() => ({
  search: search.value || undefined,
  categoryId: categoryId.value ?? undefined,
  includeInactive: includeInactive.value || undefined,
  page: pagination.page.value,
  pageSize: pagination.pageSize.value,
}));

const products = useProductList(query);
const categories = useCategories();
const updateProduct = useUpdateProduct();

const listError = computed(() => (products.error.value ? describeApiError(products.error.value) : null));
const activeCategories = computed(() => (categories.data.value ?? []).filter((category) => category.isActive));
const hasFilters = computed(() => Boolean(search.value || categoryId.value || includeInactive.value));

const dialogVisible = ref(false);
const editing = ref<Product | null>(null);
const togglingId = ref<string | null>(null);

function openCreate(): void {
  editing.value = null;
  dialogVisible.value = true;
}

function openEdit(product: Product): void {
  editing.value = product;
  dialogVisible.value = true;
}

async function toggleActive(product: Product): Promise<void> {
  const activate = !product.isActive;
  const accepted = await confirm({
    title: activate ? 'Activar producto' : 'Desactivar producto',
    message: activate
      ? `"${product.name}" volverá a estar disponible para la venta.`
      : `"${product.name}" dejará de estar disponible para la venta. Podrás activarlo de nuevo más tarde.`,
    acceptLabel: activate ? 'Activar' : 'Desactivar',
    danger: !activate,
  });
  if (!accepted) {
    return;
  }
  togglingId.value = product.id;
  try {
    await updateProduct.mutateAsync({ id: product.id, payload: { isActive: activate } });
    notify.success(activate ? 'Producto activado' : 'Producto desactivado', product.name);
  } catch (error) {
    if (toApiError(error).code === ApiErrorCode.PLAN_LIMIT_REACHED) {
      notify.warn('Límite del plan alcanzado', toApiError(error).message);
    } else {
      notify.error(error);
    }
  } finally {
    togglingId.value = null;
  }
}

function clearFilters(): void {
  search.value = '';
  categoryId.value = null;
  includeInactive.value = false;
}
</script>

<template>
  <div>
    <div class="card">
      <h4 class="m-0 mb-4">Productos</h4>
      <Toolbar class="mb-6">
        <template #start>
          <AppPermissionGate :permissions="Permission.PRODUCTS_MANAGE">
            <Button label="Nuevo producto" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openCreate" />
          </AppPermissionGate>
        </template>
        <template #end>
          <AppSearchFilter v-model="search" placeholder="Buscar..." label="Buscar productos" class="mr-2">
            <Select
              v-model="categoryId"
              :options="activeCategories"
              option-label="name"
              option-value="id"
              placeholder="Todas las categorías"
              aria-label="Filtrar por categoría"
              show-clear
              :loading="categories.isPending.value"
              class="w-full sm:w-56"
            />
          </AppSearchFilter>
          <label class="flex items-center gap-2" for="include-inactive">
            <ToggleSwitch v-model="includeInactive" input-id="include-inactive" />
            <span>Incluir inactivos</span>
          </label>
        </template>
      </Toolbar>

      <AppDataTable
        :value="products.data.value?.items ?? []"
        data-key="id"
        :loading="products.isFetching.value"
        :error="listError"
        :total-records="products.data.value?.total ?? 0"
        :first="pagination.first.value"
        :rows="pagination.pageSize.value"
        table-label="Listado de productos"
        :empty-title="hasFilters ? 'Sin coincidencias' : 'Aún no hay productos'"
        :empty-description="
          hasFilters ? 'Ajusta los filtros de búsqueda.' : 'Crea tu primer producto para comenzar a vender.'
        "
        @page="pagination.onPage"
        @retry="products.refetch()"
      >
        <Column field="sku" header="SKU" sortable style="min-width: 12rem">
          <template #body="{ data }"><span class="font-mono text-sm">{{ data.sku }}</span></template>
        </Column>
        <Column field="name" header="Nombre" sortable style="min-width: 16rem">
          <template #body="{ data }">
            <div class="font-medium">{{ data.name }}</div>
            <div v-if="data.description" class="text-muted-color max-w-md truncate text-sm">{{ data.description }}</div>
          </template>
        </Column>
        <Column header="Categoría" style="min-width: 10rem">
          <template #body="{ data }">{{ data.category?.name ?? '—' }}</template>
        </Column>
        <Column header="Precio" sortable style="min-width: 8rem">
          <template #body="{ data }">{{ formatMoney(data.price) }}</template>
        </Column>
        <Column header="Estado" style="min-width: 10rem">
          <template #body="{ data }"><AppStatusBadge :status="data.isActive" /></template>
        </Column>
        <Column v-if="canManage" :exportable="false" style="min-width: 12rem">
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
          <Button v-if="hasFilters" label="Limpiar filtros" severity="secondary" outlined @click="clearFilters" />
          <Button v-else-if="canManage" label="Nuevo producto" icon="pi pi-plus" @click="openCreate" />
        </template>
      </AppDataTable>
    </div>

    <ProductFormDialog v-if="canManage" v-model:visible="dialogVisible" :product="editing" :categories="categories.data.value ?? []" />
  </div>
</template>
