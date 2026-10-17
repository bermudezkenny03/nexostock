<!--
  Markup from Sakai Vue BestSellingWidget (menu, name, bar, percent).
  Rows come from GET /reports/top-products. The percent is the share of units sold.
  Sakai Vue © PrimeTek, MIT License.
-->
<script setup lang="ts">
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { TopProduct } from '@/modules/reports';
import { formatInteger, formatMoney } from '@/shared/utils/format';

const props = defineProps<{
  items: TopProduct[];
  loading: boolean;
}>();

const router = useRouter();
const menu = ref<{ toggle: (event: Event) => void } | null>(null);
const actions = [
  { label: 'Ver productos', icon: 'pi pi-box', command: () => router.push({ name: 'products' }) },
  { label: 'Ver reportes', icon: 'pi pi-chart-bar', command: () => router.push({ name: 'reports' }) },
];

const colors = ['bg-orange-500', 'bg-cyan-500', 'bg-pink-500', 'bg-green-500', 'bg-purple-500', 'bg-teal-500'] as const;
const textColors = ['text-orange-500', 'text-cyan-500', 'text-pink-500', 'text-primary', 'text-purple-500', 'text-teal-500'] as const;

const sold = computed(() => props.items.reduce((sum, row) => sum + row.quantity, 0));

function share(item: TopProduct): number {
  if (sold.value === 0) {
    return 0;
  }
  return Math.round((item.quantity / sold.value) * 100);
}
</script>

<template>
  <div class="card">
    <div class="flex justify-between items-center mb-6">
      <div class="font-semibold text-xl">Productos más vendidos</div>
      <div>
        <Button icon="pi pi-ellipsis-v" text rounded severity="secondary" aria-label="Acciones de productos" @click="menu?.toggle($event)" />
        <Menu ref="menu" :model="actions" popup class="min-w-40!" />
      </div>
    </div>
    <p v-if="loading" class="text-muted-color">Cargando…</p>
    <p v-else-if="items.length === 0" class="text-muted-color m-0">Aún no hay ventas confirmadas en el periodo.</p>
    <ul v-else class="list-none p-0 m-0">
      <li v-for="(item, index) in items" :key="item.productId" class="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <span class="text-surface-900 dark:text-surface-0 font-medium mr-2 mb-1 md:mb-0">{{ item.productName }}</span>
          <div class="mt-1 text-muted-color">{{ item.sku }} · {{ formatInteger(item.quantity) }} uds · {{ formatMoney(item.total) }}</div>
        </div>
        <div class="mt-2 md:mt-0 flex shrink-0 items-center">
          <div class="bg-surface-300 dark:bg-surface-500 rounded-border overflow-hidden w-24" style="height: 8px">
            <div class="h-full" :class="colors[index % colors.length]" :style="{ width: `${share(item)}%` }" />
          </div>
          <span class="ml-4 font-medium" :class="textColors[index % textColors.length]">%{{ share(item) }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>
