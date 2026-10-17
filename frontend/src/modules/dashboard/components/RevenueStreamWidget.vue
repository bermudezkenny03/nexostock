<!--
  Markup and chart options from Sakai Vue RevenueStreamWidget.
  Bars are the daily confirmed total from GET /reports/sales.
  Sakai Vue © PrimeTek, MIT License.
-->
<script setup lang="ts">
import Chart from 'primevue/chart';
import { computed, onMounted, ref, watch } from 'vue';
import type { SalesSeries } from '@/modules/reports';
import { useLayout } from '@/shared/composables/useLayout';

const props = defineProps<{
  series: SalesSeries | undefined;
  loading: boolean;
}>();

const { layoutConfig, isDarkTheme } = useLayout();
const chartData = ref<Record<string, unknown> | undefined>();
const chartOptions = ref<Record<string, unknown> | undefined>();

function color(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function setChartData() {
  const items = props.series?.items ?? [];
  return {
    labels: items.map((point) => new Date(point.day).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })),
    datasets: [
      {
        type: 'bar',
        label: 'Importe',
        backgroundColor: color('--p-primary-400', color('--p-primary-color', '#6366f1')),
        data: items.map((point) => Number(point.total)),
        barThickness: 32,
        borderRadius: { topLeft: 8, topRight: 8 },
      },
    ],
  };
}

function setChartOptions() {
  const documentStyle = getComputedStyle(document.documentElement);
  const borderColor = documentStyle.getPropertyValue('--surface-border');
  const textMutedColor = documentStyle.getPropertyValue('--text-color-secondary');
  return {
    maintainAspectRatio: false,
    aspectRatio: 0.8,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { color: textMutedColor },
        grid: { color: 'transparent', borderColor: 'transparent' },
      },
      y: {
        ticks: { color: textMutedColor },
        grid: { color: borderColor, borderColor: 'transparent', drawTicks: false },
      },
    },
  };
}

function refreshChart(): void {
  chartData.value = setChartData();
  chartOptions.value = setChartOptions();
}

watch([() => layoutConfig.primary, () => layoutConfig.surface, isDarkTheme, () => props.series], refreshChart);
onMounted(refreshChart);

const empty = computed(() => !props.loading && (props.series?.items.length ?? 0) === 0);
</script>

<template>
  <div class="card">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div class="font-semibold text-xl">Ventas por día</div>
      <slot name="toolbar" />
    </div>
    <p v-if="loading" class="text-muted-color">Cargando…</p>
    <p v-else-if="empty" class="text-muted-color m-0">No hay ventas confirmadas en el periodo para graficar.</p>
    <Chart v-else type="bar" :data="chartData" :options="chartOptions" class="h-80" />
  </div>
</template>
