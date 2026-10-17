<script setup lang="ts">
import Button from 'primevue/button';
import Column from 'primevue/column';
import InputNumber from 'primevue/inputnumber';
import Toolbar from 'primevue/toolbar';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useProductLookup } from '@/modules/products';
import { describeApiError } from '@/shared/api';
import { useNotify } from '@/shared/composables/useNotify';
import { usePagination } from '@/shared/composables/usePagination';
import { usePermissions } from '@/shared/composables/usePermissions';
import { Permission } from '@/shared/constants/permissions';
import AppDataTable from '@/shared/ui/AppDataTable.vue';
import AppDialog from '@/shared/ui/AppDialog.vue';
import AppFormField from '@/shared/ui/AppFormField.vue';
import AppPermissionGate from '@/shared/ui/AppPermissionGate.vue';
import AppStatusBadge from '@/shared/ui/AppStatusBadge.vue';
import { formatDateTime, formatInteger } from '@/shared/utils/format';
import { useStockList, useUpdateMinQuantity } from '../composables/useStock';
import type { StockView } from '../types';

const { can } = usePermissions();
const router = useRouter();
const canManage = computed(() => can(Permission.INVENTORY_MANAGE));
const notify = useNotify();
const pagination = usePagination();
const products = useProductLookup();

const query = computed(() => ({ page: pagination.page.value, pageSize: pagination.pageSize.value }));
const stock = useStockList(query);
const updateMin = useUpdateMinQuantity();
const listError = computed(() => (stock.error.value ? describeApiError(stock.error.value) : null));

const editing = ref<StockView | null>(null);
const minQuantity = ref(0);
const minVisible = computed({
  get: () => editing.value !== null,
  set: (open: boolean) => {
    if (!open) {
      editing.value = null;
    }
  },
});

function productLabel(productId: string): string {
  return products.byId.value.get(productId)?.name ?? productId.slice(0, 8);
}

function productSku(productId: string): string {
  return products.byId.value.get(productId)?.sku ?? '—';
}

function stockStatus(row: StockView): 'LOWSTOCK' | 'INSTOCK' | 'OUTOFSTOCK' {
  if (row.quantity <= 0) {
    return 'OUTOFSTOCK';
  }
  return row.quantity <= row.minQuantity ? 'LOWSTOCK' : 'INSTOCK';
}

const stockStatuses = {
  INSTOCK: { label: 'En stock', severity: 'success' as const },
  LOWSTOCK: { label: 'Stock bajo', severity: 'warn' as const },
  OUTOFSTOCK: { label: 'Agotado', severity: 'danger' as const },
};

function openMin(row: StockView): void {
  editing.value = row;
  minQuantity.value = row.minQuantity;
}

async function saveMin(): Promise<void> {
  if (!editing.value) {
    return;
  }
  try {
    await updateMin.mutateAsync({ productId: editing.value.productId, payload: { minQuantity: minQuantity.value } });
    notify.success('Stock mínimo actualizado', productLabel(editing.value.productId));
    editing.value = null;
  } catch (error) {
    notify.error(error);
  }
}
</script>

<template>
  <div>
    <div class="card">
      <h4 class="m-0 mb-4">Inventario</h4>
      <Toolbar class="mb-6">
        <template #start>
          <AppPermissionGate :permissions="Permission.INVENTORY_MANAGE">
            <Button label="Nuevo movimiento" icon="pi pi-plus" severity="secondary" @click="router.push({ name: 'inventory-movements', query: { new: '1' } })" />
          </AppPermissionGate>
        </template>
      </Toolbar>

      <AppDataTable
        :value="stock.data.value?.items ?? []"
        data-key="productId"
        :loading="stock.isFetching.value"
        :error="listError"
        :total-records="stock.data.value?.total ?? 0"
        :first="pagination.first.value"
        :rows="pagination.pageSize.value"
        table-label="Existencias"
        empty-title="Sin existencias"
        empty-description="Los productos aparecen aquí cuando se les asigna inventario."
        @page="pagination.onPage"
        @retry="stock.refetch()"
      >
        <Column header="SKU" style="min-width: 8rem">
          <template #body="{ data }"><span class="font-mono text-sm">{{ productSku(data.productId) }}</span></template>
        </Column>
        <Column header="Producto" style="min-width: 14rem">
          <template #body="{ data }">{{ productLabel(data.productId) }}</template>
        </Column>
        <Column header="Existencia" sortable style="min-width: 8rem">
          <template #body="{ data }">{{ formatInteger(data.quantity) }}</template>
        </Column>
        <Column header="Mínimo" style="min-width: 8rem">
          <template #body="{ data }">{{ formatInteger(data.minQuantity) }}</template>
        </Column>
        <Column header="Estado" style="min-width: 8rem">
          <template #body="{ data }"><AppStatusBadge :status="stockStatus(data)" :statuses="stockStatuses" /></template>
        </Column>
        <Column header="Actualizado" style="min-width: 10rem">
          <template #body="{ data }">{{ formatDateTime(data.updatedAt) }}</template>
        </Column>
        <Column v-if="canManage" :exportable="false" style="min-width: 6rem">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" text rounded severity="secondary" :aria-label="`Editar mínimo de ${productLabel(data.productId)}`" @click="openMin(data)" />
          </template>
        </Column>
      </AppDataTable>
    </div>

    <AppDialog v-model:visible="minVisible" title="Stock mínimo" :busy="updateMin.isPending.value">
      <AppFormField id="stock-min" label="Cantidad mínima">
        <template #default="{ id }">
          <InputNumber v-model="minQuantity" :input-id="id" :min="0" :max="1000000" :use-grouping="false" fluid />
        </template>
      </AppFormField>
      <template #footer>
        <Button label="Cancelar" severity="secondary" outlined :disabled="updateMin.isPending.value" @click="editing = null" />
        <Button label="Guardar" icon="pi pi-check" :loading="updateMin.isPending.value" @click="saveMin" />
      </template>
    </AppDialog>
  </div>
</template>
