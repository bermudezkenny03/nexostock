<script setup lang="ts">
import Column from 'primevue/column';
import Message from 'primevue/message';
import { computed } from 'vue';
import { useMyBusiness } from '@/modules/businesses';
import { useLowStock, useReportsOverview } from '@/modules/reports';
import { describeApiError } from '@/shared/api';
import { usePermissions } from '@/shared/composables/usePermissions';
import { Permission } from '@/shared/constants/permissions';
import AppDataTable from '@/shared/ui/AppDataTable.vue';
import AppPageHeader from '@/shared/ui/AppPageHeader.vue';
import AppStatCard from '@/shared/ui/AppStatCard.vue';
import { formatInteger, formatMoney } from '@/shared/utils/format';
import PlanUsageCard from '../components/PlanUsageCard.vue';

const { can } = usePermissions();
const canViewReports = computed(() => can(Permission.REPORTS_VIEW));

const business = useMyBusiness();
const overview = useReportsOverview(canViewReports);
const lowStock = useLowStock(canViewReports);

const overviewData = computed(() => overview.data.value);
const overviewError = computed(() => (overview.error.value ? describeApiError(overview.error.value) : null));
const lowStockError = computed(() => (lowStock.error.value ? describeApiError(lowStock.error.value) : null));
</script>

<template>
  <div>
    <AppPageHeader
      :title="business.data.value?.name ?? 'Panel'"
      subtitle="Resumen de productos, inventario y ventas de tu negocio."
    />

    <template v-if="canViewReports">
      <Message v-if="overviewError" severity="error" class="mb-4" :closable="false">{{ overviewError }}</Message>
      <div class="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AppStatCard
          label="Productos activos"
          icon="pi pi-box"
          :loading="overview.isPending.value"
          :value="overviewData ? formatInteger(overviewData.products.active) : null"
          :hint="overviewData ? `${formatInteger(overviewData.products.total)} registrados en total` : undefined"
        />
        <AppStatCard
          label="Unidades en inventario"
          icon="pi pi-warehouse"
          :loading="overview.isPending.value"
          :value="overviewData ? formatInteger(overviewData.inventory.units) : null"
          :hint="overviewData ? `${formatInteger(overviewData.inventory.skuCount)} SKU con existencias` : undefined"
        />
        <AppStatCard
          label="Productos con stock bajo"
          icon="pi pi-exclamation-triangle"
          :loading="overview.isPending.value"
          :value="overviewData ? formatInteger(overviewData.inventory.lowStock) : null"
          hint="En o por debajo del mínimo configurado"
        />
        <AppStatCard
          label="Ventas (últimos 30 días)"
          icon="pi pi-shopping-cart"
          :loading="overview.isPending.value"
          :value="overviewData ? formatMoney(overviewData.sales.total) : null"
          :hint="overviewData ? `${formatInteger(overviewData.sales.count)} ventas confirmadas` : undefined"
        />
      </div>
    </template>

    <div class="grid gap-6 xl:grid-cols-3">
      <PlanUsageCard
        :business="business.data.value"
        :loading="business.isPending.value"
        :active-products="overviewData?.products.active ?? null"
      />

      <section v-if="canViewReports" class="ns-card xl:col-span-2" aria-labelledby="low-stock-title">
        <h2 id="low-stock-title" class="mt-0 mb-4 text-lg font-semibold">Alertas de stock mínimo</h2>
        <AppDataTable
          :value="lowStock.data.value ?? []"
          data-key="productId"
          :loading="lowStock.isPending.value"
          :error="lowStockError"
          :rows="5"
          table-label="Productos con stock bajo"
          empty-title="Sin alertas"
          empty-description="Todos los productos están por encima de su mínimo."
          @retry="lowStock.refetch()"
        >
          <Column field="sku" header="SKU">
            <template #body="{ data }">
              <span class="ns-mono">{{ data.sku ?? '—' }}</span>
            </template>
          </Column>
          <Column field="name" header="Producto">
            <template #body="{ data }">{{ data.name ?? 'Producto no disponible' }}</template>
          </Column>
          <Column field="quantity" header="Existencia" class="text-right" />
          <Column field="minQuantity" header="Mínimo" class="text-right" />
        </AppDataTable>
      </section>

      <section v-else class="ns-card xl:col-span-2">
        <h2 class="mt-0 mb-2 text-lg font-semibold">Indicadores</h2>
        <p class="ns-muted m-0">
          Tu rol no incluye el permiso de reportes, por eso no se muestran indicadores de ventas e inventario.
        </p>
      </section>
    </div>
  </div>
</template>
