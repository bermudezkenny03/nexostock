<script setup lang="ts">
import Button from 'primevue/button';
import Column from 'primevue/column';
import Select from 'primevue/select';
import Toolbar from 'primevue/toolbar';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { describeApiError } from '@/shared/api';
import { useConfirmAction } from '@/shared/composables/useConfirmAction';
import { useNotify } from '@/shared/composables/useNotify';
import { usePagination } from '@/shared/composables/usePagination';
import { usePermissions } from '@/shared/composables/usePermissions';
import { Permission } from '@/shared/constants/permissions';
import AppDataTable from '@/shared/ui/AppDataTable.vue';
import AppDialog from '@/shared/ui/AppDialog.vue';
import AppPermissionGate from '@/shared/ui/AppPermissionGate.vue';
import AppStatusBadge from '@/shared/ui/AppStatusBadge.vue';
import { formatDateTime, formatInteger, formatMoney, shortId } from '@/shared/utils/format';
import SaleFormDialog from '../components/SaleFormDialog.vue';
import { useCancelSale, useSale, useSalesList } from '../composables/useSales';
import type { Sale, SaleStatus } from '../types';

const { can } = usePermissions();
const canManage = computed(() => can(Permission.SALES_MANAGE));
const notify = useNotify();
const confirm = useConfirmAction();
const route = useRoute();
const router = useRouter();

const status = ref<SaleStatus | null>(null);
const pagination = usePagination();
watch(status, () => pagination.reset());

const query = computed(() => ({
  status: status.value ?? undefined,
  page: pagination.page.value,
  pageSize: pagination.pageSize.value,
}));

const sales = useSalesList(query);
const cancelSale = useCancelSale();
const listError = computed(() => (sales.error.value ? describeApiError(sales.error.value) : null));

const createVisible = ref(false);
const selectedId = ref<string | null>(typeof route.query.id === 'string' ? route.query.id : null);
const detail = useSale(selectedId);
const detailVisible = computed({
  get: () => Boolean(selectedId.value),
  set: (open: boolean) => {
    if (!open) {
      closeDetail();
    }
  },
});

watch(
  () => route.query.id,
  (id) => {
    selectedId.value = typeof id === 'string' ? id : null;
  },
);

const statusOptions: { label: string; value: SaleStatus }[] = [
  { label: 'Confirmada', value: 'CONFIRMED' },
  { label: 'Pendiente', value: 'PENDING' },
  { label: 'Fallida', value: 'FAILED' },
  { label: 'Cancelada', value: 'CANCELLED' },
];

function openDetail(sale: Sale): void {
  void router.replace({ name: 'sales', query: { id: sale.id } });
}

function closeDetail(): void {
  selectedId.value = null;
  void router.replace({ name: 'sales' });
}

async function onCancel(sale: Sale): Promise<void> {
  const accepted = await confirm({
    title: 'Cancelar venta',
    message: `Se cancelará la venta ${shortId(sale.id)} y se devolverá el inventario. ¿Continuar?`,
    acceptLabel: 'Cancelar venta',
    danger: true,
  });
  if (!accepted) {
    return;
  }
  try {
    await cancelSale.mutateAsync(sale.id);
    notify.success('Venta cancelada', shortId(sale.id));
    closeDetail();
  } catch (error) {
    notify.error(error);
  }
}
</script>

<template>
  <div>
    <div class="card">
      <h4 class="m-0 mb-4">Ventas</h4>
      <Toolbar class="mb-6">
        <template #start>
          <AppPermissionGate :permissions="Permission.SALES_MANAGE">
            <Button label="Nueva venta" icon="pi pi-plus" severity="secondary" class="mr-2" @click="createVisible = true" />
          </AppPermissionGate>
        </template>
        <template #end>
          <Select
            v-model="status"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            placeholder="Todos los estados"
            aria-label="Filtrar por estado"
            show-clear
            class="w-full sm:w-56"
          />
        </template>
      </Toolbar>

      <AppDataTable
        :value="sales.data.value?.items ?? []"
        data-key="id"
        :loading="sales.isFetching.value"
        :error="listError"
        :total-records="sales.data.value?.total ?? 0"
        :first="pagination.first.value"
        :rows="pagination.pageSize.value"
        table-label="Listado de ventas"
        :empty-title="status ? 'Sin coincidencias' : 'Aún no hay ventas'"
        :empty-description="status ? 'Ajusta el filtro de estado.' : 'Registra la primera venta del negocio.'"
        @page="pagination.onPage"
        @retry="sales.refetch()"
      >
        <Column header="Folio" style="min-width: 8rem">
          <template #body="{ data }"><span class="font-mono text-sm">{{ shortId(data.id) }}</span></template>
        </Column>
        <Column header="Fecha" style="min-width: 10rem">
          <template #body="{ data }">{{ formatDateTime(data.createdAt) }}</template>
        </Column>
        <Column header="Productos" style="min-width: 14rem">
          <template #body="{ data }">{{ data.lines.map((line: Sale['lines'][number]) => `${line.productName} ×${line.quantity}`).join(', ') || '—' }}</template>
        </Column>
        <Column header="Total" sortable style="min-width: 8rem">
          <template #body="{ data }">{{ formatMoney(data.total) }}</template>
        </Column>
        <Column header="Estado" style="min-width: 8rem">
          <template #body="{ data }"><AppStatusBadge :status="data.status" /></template>
        </Column>
        <Column :exportable="false" style="min-width: 8rem">
          <template #body="{ data }">
            <Button icon="pi pi-search" text rounded severity="secondary" :aria-label="`Ver ${shortId(data.id)}`" @click="openDetail(data)" />
          </template>
        </Column>
        <template #empty-actions>
          <Button v-if="canManage && !status" label="Nueva venta" icon="pi pi-plus" @click="createVisible = true" />
        </template>
      </AppDataTable>
    </div>

    <SaleFormDialog v-if="canManage" v-model:visible="createVisible" />

    <AppDialog v-model:visible="detailVisible" title="Detalle de venta">
      <p v-if="detail.isPending.value" class="text-muted-color">Cargando…</p>
      <p v-else-if="detail.error.value" class="text-muted-color">{{ describeApiError(detail.error.value) }}</p>
      <template v-else-if="detail.data.value">
        <dl class="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 m-0">
          <dt class="text-muted-color">Folio</dt>
          <dd class="m-0 font-mono">{{ shortId(detail.data.value.id) }}</dd>
          <dt class="text-muted-color">Estado</dt>
          <dd class="m-0"><AppStatusBadge :status="detail.data.value.status" /></dd>
          <dt class="text-muted-color">Total</dt>
          <dd class="m-0 font-medium">{{ formatMoney(detail.data.value.total) }}</dd>
          <dt class="text-muted-color">Fecha</dt>
          <dd class="m-0">{{ formatDateTime(detail.data.value.createdAt) }}</dd>
          <dt v-if="detail.data.value.note" class="text-muted-color">Nota</dt>
          <dd v-if="detail.data.value.note" class="m-0">{{ detail.data.value.note }}</dd>
          <dt v-if="detail.data.value.failureReason" class="text-muted-color">Error</dt>
          <dd v-if="detail.data.value.failureReason" class="m-0">{{ detail.data.value.failureReason }}</dd>
        </dl>
        <ul class="list-none p-0 mt-4 mb-0 flex flex-col gap-2">
          <li v-for="line in detail.data.value.lines" :key="line.productId" class="flex justify-between gap-4 border-surface border-b py-2">
            <span>{{ line.productName }} <span class="text-muted-color">{{ line.sku }}</span></span>
            <span>{{ formatInteger(line.quantity) }} × {{ formatMoney(line.unitPrice) }}</span>
          </li>
        </ul>
      </template>
      <template #footer>
        <Button label="Cerrar" severity="secondary" outlined @click="closeDetail" />
        <Button
          v-if="canManage && detail.data.value?.status === 'CONFIRMED'"
          label="Cancelar venta"
          icon="pi pi-ban"
          severity="danger"
          :loading="cancelSale.isPending.value"
          @click="detail.data.value && onCancel(detail.data.value)"
        />
      </template>
    </AppDialog>
  </div>
</template>
