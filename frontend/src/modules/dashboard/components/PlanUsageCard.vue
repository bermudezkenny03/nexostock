<script setup lang="ts">
import ProgressBar from 'primevue/progressbar';
import Skeleton from 'primevue/skeleton';
import Tag from 'primevue/tag';
import { computed } from 'vue';
import type { BusinessProfile } from '@/modules/businesses';
import { formatInteger } from '@/shared/utils/format';

const props = defineProps<{
  business: BusinessProfile | undefined;
  loading: boolean;
  activeProducts: number | null;
}>();

interface Usage {
  label: string;
  used: number | null;
  limit: number | null;
}

const usages = computed<Usage[]>(() => {
  const plan = props.business?.plan;
  if (!plan) {
    return [];
  }
  return [
    { label: 'Usuarios activos', used: props.business?.activeUsers ?? null, limit: plan.maxUsers },
    { label: 'Productos activos', used: props.activeProducts, limit: plan.maxProducts },
  ];
});

function percent(usage: Usage): number {
  if (usage.used === null || usage.limit === null || usage.limit === 0) {
    return 0;
  }
  return Math.min(100, Math.round((usage.used / usage.limit) * 100));
}
</script>

<template>
  <div class="card">
    <div class="flex items-center justify-between mb-6">
      <div class="font-semibold text-xl">Tu plan</div>
      <Skeleton v-if="loading" width="5rem" height="1.5rem" />
      <Tag v-else-if="business" :value="business.plan.name" icon="pi pi-star" />
    </div>
    <template v-if="loading">
      <Skeleton class="mb-3" height="1rem" />
      <Skeleton height="1rem" />
    </template>
    <template v-else-if="business">
      <p v-if="business.plan.description" class="text-muted-color mt-0 mb-4">{{ business.plan.description }}</p>
      <ul class="m-0 flex list-none flex-col gap-4 p-0">
        <li v-for="usage in usages" :key="usage.label">
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
            :value="percent(usage)"
            :show-value="false"
            style="height: 0.5rem"
            :aria-label="`${usage.label}: ${percent(usage)}% del límite`"
          />
        </li>
      </ul>
    </template>
  </div>
</template>
