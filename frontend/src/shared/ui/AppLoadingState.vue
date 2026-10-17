<script setup lang="ts">
import Skeleton from 'primevue/skeleton';

withDefaults(
  defineProps<{
    variant?: 'page' | 'table' | 'cards';
    rows?: number;
    label?: string;
  }>(),
  { variant: 'table', rows: 5, label: 'Cargando…' },
);
</script>

<template>
  <div role="status" aria-live="polite" :aria-label="label">
    <span class="sr-only">{{ label }}</span>
    <template v-if="variant === 'cards'">
      <div class="grid grid-cols-12 gap-8">
        <div v-for="n in rows" :key="n" class="col-span-12 lg:col-span-6 xl:col-span-3">
          <div class="card mb-0">
            <Skeleton width="40%" height="0.9rem" class="mb-3" />
            <Skeleton width="60%" height="1.8rem" />
          </div>
        </div>
      </div>
    </template>
    <template v-else-if="variant === 'page'">
      <Skeleton width="30%" height="2rem" class="mb-4" />
      <Skeleton width="100%" height="12rem" />
    </template>
    <template v-else>
      <div v-for="n in rows" :key="n" class="flex items-center gap-4 py-3">
        <Skeleton width="15%" height="1rem" />
        <Skeleton width="40%" height="1rem" />
        <Skeleton width="20%" height="1rem" />
        <Skeleton width="10%" height="1rem" />
      </div>
    </template>
  </div>
</template>
