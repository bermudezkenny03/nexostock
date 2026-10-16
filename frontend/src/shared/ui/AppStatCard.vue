<script setup lang="ts">
import Skeleton from 'primevue/skeleton';

withDefaults(
  defineProps<{
    label: string;
    value?: string | number | null;
    icon?: string;
    hint?: string;
    loading?: boolean;
  }>(),
  { value: null, icon: undefined, hint: undefined, loading: false },
);
</script>

<template>
  <article class="ns-card app-stat-card" :aria-busy="loading">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="app-stat-card__label">{{ label }}</p>
        <Skeleton v-if="loading" width="6rem" height="1.9rem" />
        <p v-else class="app-stat-card__value">{{ value ?? '—' }}</p>
      </div>
      <span v-if="icon" class="app-stat-card__icon" aria-hidden="true"><i :class="icon" /></span>
    </div>
    <p v-if="hint || $slots.default" class="app-stat-card__hint">
      <slot>{{ hint }}</slot>
    </p>
  </article>
</template>

<style scoped>
.app-stat-card__label {
  margin: 0 0 var(--ns-space-2);
  color: var(--ns-text-muted);
  font-weight: 500;
}

.app-stat-card__value {
  margin: 0;
  font-size: var(--ns-text-2xl);
  font-weight: 700;
}

.app-stat-card__icon {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--ns-radius-md);
  background: var(--p-highlight-background);
  color: var(--p-highlight-color);
  font-size: 1.2rem;
}

.app-stat-card__hint {
  margin: var(--ns-space-3) 0 0;
  color: var(--ns-text-muted);
  font-size: var(--ns-text-sm);
}
</style>
