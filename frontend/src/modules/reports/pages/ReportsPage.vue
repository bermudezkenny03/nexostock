<script setup lang="ts">
import DatePicker from 'primevue/datepicker';
import Message from 'primevue/message';
import { computed, ref } from 'vue';
import { BestSellingWidget, RevenueStreamWidget, StatsWidget } from '@/modules/dashboard';
import { describeApiError } from '@/shared/api';
import { useLowStock, useReportsOverview, useSalesSeries, useTopProducts } from '../composables/useReports';
import type { DateRange } from '../types';

const range = ref<Date[] | null>(null);

const queryRange = computed<DateRange>(() => {
  const [from, to] = range.value ?? [];
  if (!from || !to) {
    return {};
  }
  return { from: from.toISOString(), to: to.toISOString() };
});

const overview = useReportsOverview(true, queryRange);
const lowStock = useLowStock();
const series = useSalesSeries(true, queryRange);
const topProducts = useTopProducts(true, queryRange);
const overviewError = computed(() => (overview.error.value ? describeApiError(overview.error.value) : null));
</script>

<template>
  <div class="grid grid-cols-12 gap-8">
    <div class="col-span-12">
      <div class="card mb-0">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div class="font-semibold text-xl mb-1">Reportes</div>
            <p class="text-muted-color m-0">Indicadores del periodo. Si no eliges fechas, el backend usa los últimos 30 días.</p>
          </div>
          <DatePicker
            v-model="range"
            selection-mode="range"
            :manual-input="false"
            show-icon
            date-format="dd/mm/yy"
            placeholder="Periodo"
            input-id="report-range"
            class="w-full sm:w-72"
          />
        </div>
      </div>
    </div>

    <Message v-if="overviewError" severity="error" class="col-span-12 mb-0" :closable="false">{{ overviewError }}</Message>
    <StatsWidget :overview="overview.data.value" :loading="overview.isPending.value" />

    <div class="col-span-12 xl:col-span-6">
      <BestSellingWidget :items="topProducts.data.value ?? []" :loading="topProducts.isPending.value" />
      <div class="card">
        <div class="font-semibold text-xl mb-4">Stock bajo</div>
        <p v-if="lowStock.isPending.value" class="text-muted-color m-0">Cargando…</p>
        <p v-else-if="(lowStock.data.value ?? []).length === 0" class="text-muted-color m-0">Sin productos por debajo del mínimo.</p>
        <ul v-else class="list-none p-0 m-0">
          <li
            v-for="(item, index) in lowStock.data.value"
            :key="item.productId"
            class="flex items-center py-2 border-surface"
            :class="{ 'border-b': index < (lowStock.data.value?.length ?? 0) - 1 }"
          >
            <div class="w-12 h-12 flex items-center justify-center bg-orange-100 dark:bg-orange-400/10 rounded-full mr-4 shrink-0">
              <i class="pi pi-exclamation-triangle text-xl! text-orange-500" />
            </div>
            <span class="text-surface-900 dark:text-surface-0 leading-normal">
              {{ item.name ?? item.sku ?? 'Producto' }}
              <span class="text-surface-700 dark:text-surface-100">
                está en <span class="text-primary font-bold">{{ item.quantity }}</span>, mínimo {{ item.minQuantity }}.
              </span>
            </span>
          </li>
        </ul>
      </div>
    </div>
    <div class="col-span-12 xl:col-span-6">
      <RevenueStreamWidget :series="series.data.value" :loading="series.isPending.value" />
    </div>
  </div>
</template>
