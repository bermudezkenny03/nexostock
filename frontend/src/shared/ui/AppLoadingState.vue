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
  <div class="app-loading-state" role="status" aria-live="polite" :aria-label="label">
    <span class="sr-only">{{ label }}</span>
    <template v-if="variant === 'cards'">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="n in rows" :key="n" class="ns-card">
          <Skeleton width="40%" height="0.9rem" class="mb-3" />
          <Skeleton width="60%" height="1.8rem" />
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
