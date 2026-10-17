<script setup lang="ts">
import Message from 'primevue/message';
import Select from 'primevue/select';
import { computed, ref } from 'vue';
import { useMyBusiness } from '@/modules/businesses';
import { useLowStock, useReportsOverview, useSalesSeries, useTopProducts, type DateRange } from '@/modules/reports';
import { useSalesList } from '@/modules/sales';
import { describeApiError } from '@/shared/api';
import { usePermissions } from '@/shared/composables/usePermissions';
import { Permission } from '@/shared/constants/permissions';
import BestSellingWidget from '../components/BestSellingWidget.vue';
import NotificationsWidget from '../components/NotificationsWidget.vue';
import RecentSalesWidget from '../components/RecentSalesWidget.vue';
import RevenueStreamWidget from '../components/RevenueStreamWidget.vue';
import StatsWidget from '../components/StatsWidget.vue';

const { can } = usePermissions();
const canViewReports = computed(() => can(Permission.REPORTS_VIEW));
const canViewSales = computed(() => can([Permission.SALES_VIEW, Permission.REPORTS_VIEW]));

const periods = [
  { label: '7 días', value: 7 },
  { label: '30 días', value: 30 },
  { label: '90 días', value: 90 },
] as const;

const period = ref<(typeof periods)[number]['value']>(30);
const range = computed<DateRange>(() => {
  if (period.value === 30) {
    return {};
  }
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - period.value);
  return { from: from.toISOString(), to: to.toISOString() };
});

const business = useMyBusiness();
const overview = useReportsOverview(canViewReports, range);
const lowStock = useLowStock(canViewReports);
const series = useSalesSeries(canViewReports, range);
const topProducts = useTopProducts(canViewReports, range);
const recentSales = useSalesList(
  computed(() => ({ page: 1, pageSize: 5 })),
  canViewSales,
);

const overviewError = computed(() => (overview.error.value ? describeApiError(overview.error.value) : null));
</script>

<template>
  <div class="grid grid-cols-12 gap-8">
    <template v-if="canViewReports">
      <Message v-if="overviewError" severity="error" class="col-span-12 mb-0" :closable="false">{{ overviewError }}</Message>
      <StatsWidget :overview="overview.data.value" :loading="overview.isPending.value" :sales-label="`Ventas (${period} días)`" />
    </template>
    <div v-else class="col-span-12">
      <div class="card">
        <div class="font-semibold text-xl mb-2">Indicadores</div>
        <p class="text-muted-color m-0">Tu rol no incluye el permiso de reportes, por eso no se muestran indicadores de ventas e inventario.</p>
      </div>
    </div>

    <div class="col-span-12 xl:col-span-6">
      <RecentSalesWidget
        v-if="canViewSales"
        :items="recentSales.data.value?.items ?? []"
        :loading="recentSales.isPending.value"
      />
      <BestSellingWidget v-if="canViewReports" :items="topProducts.data.value ?? []" :loading="topProducts.isPending.value" />
    </div>
    <div class="col-span-12 xl:col-span-6">
      <RevenueStreamWidget v-if="canViewReports" :series="series.data.value" :loading="series.isPending.value">
        <template #toolbar>
          <Select v-model="period" :options="[...periods]" option-label="label" option-value="value" aria-label="Periodo de ventas" class="w-36" />
        </template>
      </RevenueStreamWidget>
      <NotificationsWidget
        :alerts="lowStock.data.value ?? []"
        :loading="canViewReports && lowStock.isPending.value"
        :show-stock="canViewReports"
        :business="business.data.value"
        :active-products="overview.data.value?.products.active ?? null"
      />
    </div>
  </div>
</template>
