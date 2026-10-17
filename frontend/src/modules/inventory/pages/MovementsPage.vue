<script setup lang="ts">
import Button from 'primevue/button';
import Column from 'primevue/column';
import Toolbar from 'primevue/toolbar';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProductLookup } from '@/modules/products';
import { describeApiError } from '@/shared/api';
import { usePagination } from '@/shared/composables/usePagination';
import { usePermissions } from '@/shared/composables/usePermissions';
import { Permission } from '@/shared/constants/permissions';
import AppDataTable from '@/shared/ui/AppDataTable.vue';
import AppPermissionGate from '@/shared/ui/AppPermissionGate.vue';
import AppStatusBadge from '@/shared/ui/AppStatusBadge.vue';
import { formatDateTime, formatInteger } from '@/shared/utils/format';
import MovementFormDialog from '../components/MovementFormDialog.vue';
import { useMovements } from '../composables/useStock';

const { can } = usePermissions();
const canManage = computed(() => can(Permission.INVENTORY_MANAGE));
const route = useRoute();
const router = useRouter();
const pagination = usePagination();
const products = useProductLookup();
const createVisible = ref(route.query.new === '1');

watch(
  () => route.query.new,
  (value) => {
    if (value === '1') {
      createVisible.value = true;
    }
  },
);

watch(createVisible, (open) => {
  if (!open && route.query.new === '1') {
    void router.replace({ name: 'inventory-movements' });
  }
});

const query = computed(() => ({ page: pagination.page.value, pageSize: pagination.pageSize.value }));
const movements = useMovements(query);
const listError = computed(() => (movements.error.value ? describeApiError(movements.error.value) : null));

function productLabel(productId: string): string {
  return products.byId.value.get(productId)?.name ?? productId.slice(0, 8);
}

const typeStatuses = {
  IN: { label: 'Entrada', severity: 'success' as const },
  OUT: { label: 'Salida', severity: 'warn' as const },
  ADJUSTMENT: { label: 'Ajuste', severity: 'info' as const },
};
</script>

<template>
  <div>
    <div class="card">
      <h4 class="m-0 mb-4">Movimientos</h4>
      <Toolbar class="mb-6">
        <template #start>
          <AppPermissionGate :permissions="Permission.INVENTORY_MANAGE">
            <Button label="Nuevo movimiento" icon="pi pi-plus" severity="secondary" class="mr-2" @click="createVisible = true" />
          </AppPermissionGate>
        </template>
      </Toolbar>

      <AppDataTable
        :value="movements.data.value?.items ?? []"
        data-key="id"
        :loading="movements.isFetching.value"
        :error="listError"
        :total-records="movements.data.value?.total ?? 0"
        :first="pagination.first.value"
        :rows="pagination.pageSize.value"
        table-label="Movimientos de inventario"
        empty-title="Sin movimientos"
        empty-description="Las entradas, salidas y ajustes aparecerán aquí."
        @page="pagination.onPage"
        @retry="movements.refetch()"
      >
        <Column header="Fecha" style="min-width: 10rem">
          <template #body="{ data }">{{ formatDateTime(data.createdAt) }}</template>
        </Column>
        <Column header="Producto" style="min-width: 12rem">
          <template #body="{ data }">{{ productLabel(data.productId) }}</template>
        </Column>
        <Column header="Tipo" style="min-width: 8rem">
          <template #body="{ data }"><AppStatusBadge :status="data.type" :statuses="typeStatuses" /></template>
        </Column>
        <Column header="Cantidad" style="min-width: 8rem">
          <template #body="{ data }">{{ formatInteger(data.quantity) }}</template>
        </Column>
        <Column header="Stock resultante" style="min-width: 8rem">
          <template #body="{ data }">{{ formatInteger(data.stockAfter) }}</template>
        </Column>
        <Column header="Motivo" style="min-width: 12rem">
          <template #body="{ data }"><span class="text-muted-color">{{ data.reason ?? data.referenceType ?? '—' }}</span></template>
        </Column>
        <template #empty-actions>
          <Button v-if="canManage" label="Nuevo movimiento" icon="pi pi-plus" @click="createVisible = true" />
        </template>
      </AppDataTable>
    </div>

    <MovementFormDialog v-if="canManage" v-model:visible="createVisible" />
  </div>
</template>
