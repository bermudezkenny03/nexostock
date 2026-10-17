<!--
  Visual from Sakai Vue src/components/dashboard/StatsWidget.vue.
  Values come from GET /reports/overview. Sakai Vue © PrimeTek, MIT License.
-->
<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
import type { ReportsOverview } from '@/modules/reports';
import { formatInteger, formatMoney } from '@/shared/utils/format';

withDefaults(
  defineProps<{
    overview: ReportsOverview | undefined;
    loading: boolean;
    salesLabel?: string;
  }>(),
  { salesLabel: 'Ventas (30 días)' },
);
</script>

<template>
  <div class="col-span-12 lg:col-span-6 xl:col-span-3">
    <div class="card mb-0">
      <div class="flex justify-between mb-4">
        <div>
          <span class="block text-muted-color font-medium mb-4">Productos activos</span>
          <Skeleton v-if="loading" width="4rem" height="1.5rem" />
          <div v-else class="text-surface-900 dark:text-surface-0 font-medium text-xl">
            {{ overview ? formatInteger(overview.products.active) : '—' }}
          </div>
        </div>
        <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
          <i class="pi pi-box text-blue-500 text-xl!" />
        </div>
      </div>
      <span class="text-primary font-medium">{{ overview ? formatInteger(overview.products.total) : '—' }} </span>
      <span class="text-muted-color">registrados en total</span>
    </div>
  </div>
  <div class="col-span-12 lg:col-span-6 xl:col-span-3">
    <div class="card mb-0">
      <div class="flex justify-between mb-4">
        <div>
          <span class="block text-muted-color font-medium mb-4">Unidades en inventario</span>
          <Skeleton v-if="loading" width="4rem" height="1.5rem" />
          <div v-else class="text-surface-900 dark:text-surface-0 font-medium text-xl">
            {{ overview ? formatInteger(overview.inventory.units) : '—' }}
          </div>
        </div>
        <div class="flex items-center justify-center bg-orange-100 dark:bg-orange-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
          <i class="pi pi-warehouse text-orange-500 text-xl!" />
        </div>
      </div>
      <span class="text-primary font-medium">{{ overview ? formatInteger(overview.inventory.skuCount) : '—' }} </span>
      <span class="text-muted-color">SKU con existencias</span>
    </div>
  </div>
  <div class="col-span-12 lg:col-span-6 xl:col-span-3">
    <div class="card mb-0">
      <div class="flex justify-between mb-4">
        <div>
          <span class="block text-muted-color font-medium mb-4">Stock bajo</span>
          <Skeleton v-if="loading" width="4rem" height="1.5rem" />
          <div v-else class="text-surface-900 dark:text-surface-0 font-medium text-xl">
            {{ overview ? formatInteger(overview.inventory.lowStock) : '—' }}
          </div>
        </div>
        <div class="flex items-center justify-center bg-cyan-100 dark:bg-cyan-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
          <i class="pi pi-exclamation-triangle text-cyan-500 text-xl!" />
        </div>
      </div>
      <span class="text-muted-color">en o por debajo del mínimo</span>
    </div>
  </div>
  <div class="col-span-12 lg:col-span-6 xl:col-span-3">
    <div class="card mb-0">
      <div class="flex justify-between mb-4">
        <div>
          <span class="block text-muted-color font-medium mb-4">{{ salesLabel }}</span>
          <Skeleton v-if="loading" width="5rem" height="1.5rem" />
          <div v-else class="text-surface-900 dark:text-surface-0 font-medium text-xl">
            {{ overview ? formatMoney(overview.sales.total) : '—' }}
          </div>
        </div>
        <div class="flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
          <i class="pi pi-shopping-cart text-purple-500 text-xl!" />
        </div>
      </div>
      <span class="text-primary font-medium">{{ overview ? formatInteger(overview.sales.count) : '—' }} </span>
      <span class="text-muted-color">ventas confirmadas</span>
    </div>
  </div>
</template>
