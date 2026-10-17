<!--
  Markup from Sakai Vue NotificationsWidget (section label, round icon, menu).
  Items are low-stock alerts and the current plan usage.
  Sakai Vue © PrimeTek, MIT License.
-->
<script setup lang="ts">
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import ProgressBar from 'primevue/progressbar';
import Tag from 'primevue/tag';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { BusinessProfile } from '@/modules/businesses';
import type { LowStockItem } from '@/modules/reports';
import { formatInteger } from '@/shared/utils/format';

const props = defineProps<{
  alerts: LowStockItem[];
  loading: boolean;
  business: BusinessProfile | undefined;
  activeProducts: number | null;
  showStock?: boolean;
}>();

const router = useRouter();
const menu = ref<{ toggle: (event: Event) => void } | null>(null);
const actions = [
  { label: 'Ver existencias', icon: 'pi pi-warehouse', command: () => router.push({ name: 'inventory' }) },
  { label: 'Ver mi plan', icon: 'pi pi-star', command: () => router.push({ name: 'business-plan' }) },
];

const planItems = computed(() => {
  const plan = props.business?.plan;
  if (!plan) {
    return [];
  }
  return [
    { label: 'Usuarios activos', used: props.business?.activeUsers ?? null, limit: plan.maxUsers },
    { label: 'Productos activos', used: props.activeProducts, limit: plan.maxProducts },
  ];
});

const visibleAlerts = computed(() => props.alerts.slice(0, 5));

function percent(used: number | null, limit: number | null): number {
  if (used === null || limit === null || limit === 0) {
    return 0;
  }
  return Math.min(100, Math.round((used / limit) * 100));
}
</script>

<template>
  <div class="card">
    <div class="flex items-center justify-between mb-6">
      <div class="font-semibold text-xl">Notificaciones</div>
      <div class="flex items-center gap-2">
        <Tag v-if="business" :value="business.plan.name" icon="pi pi-star" />
        <Button icon="pi pi-ellipsis-v" text rounded severity="secondary" aria-label="Acciones de notificaciones" @click="menu?.toggle($event)" />
        <Menu ref="menu" :model="actions" popup class="min-w-40!" />
      </div>
    </div>

    <template v-if="showStock !== false">
    <span class="block text-muted-color font-medium mb-4">STOCK</span>
    <p v-if="loading" class="text-muted-color mb-6">Cargando alertas…</p>
    <p v-else-if="visibleAlerts.length === 0" class="text-muted-color mb-6">Sin alertas de stock mínimo.</p>
    <ul v-else class="p-0 mx-0 mt-0 mb-6 list-none">
      <li
        v-for="(item, index) in visibleAlerts"
        :key="item.productId"
        class="flex items-center py-2 border-surface"
        :class="{ 'border-b': index < visibleAlerts.length - 1 }"
      >
        <div class="w-12 h-12 flex items-center justify-center bg-orange-100 dark:bg-orange-400/10 rounded-full mr-4 shrink-0">
          <i class="pi pi-exclamation-triangle text-xl! text-orange-500" />
        </div>
        <span class="text-surface-900 dark:text-surface-0 leading-normal">
          {{ item.name ?? item.sku ?? 'Producto' }}
          <span class="text-surface-700 dark:text-surface-100">
            está en <span class="text-primary font-bold">{{ formatInteger(item.quantity) }}</span> unidades, mínimo
            {{ formatInteger(item.minQuantity) }}.
          </span>
        </span>
      </li>
    </ul>
    </template>

    <span class="block text-muted-color font-medium mb-4">PLAN</span>
    <ul class="p-0 m-0 list-none">
      <li v-for="usage in planItems" :key="usage.label" class="mb-4 last:mb-0">
        <div class="mb-2 flex justify-between text-sm">
          <span>{{ usage.label }}</span>
          <span class="font-semibold">
            {{ usage.used === null ? '—' : formatInteger(usage.used) }}
            /
            {{ usage.limit === null ? 'Ilimitado' : formatInteger(usage.limit) }}
          </span>
        </div>
        <ProgressBar
          v-if="usage.limit !== null && usage.used !== null"
          :value="percent(usage.used, usage.limit)"
          :show-value="false"
          style="height: 0.5rem"
          :aria-label="`${usage.label}: ${percent(usage.used, usage.limit)}% del límite`"
        />
        <p v-else-if="usage.limit === null" class="text-muted-color m-0 text-sm">Sin límite en este plan.</p>
      </li>
    </ul>
  </div>
</template>
