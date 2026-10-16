<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    title: string;
    description?: string;
    icon?: string;
    variant?: 'empty' | 'error';
  }>(),
  { variant: 'empty', description: undefined, icon: undefined },
);

const iconClass = computed(
  () => props.icon ?? (props.variant === 'error' ? 'pi pi-exclamation-circle' : 'pi pi-inbox'),
);
</script>

<template>
  <div
    class="app-empty-state"
    :class="`app-empty-state--${variant}`"
    :role="variant === 'error' ? 'alert' : 'status'"
  >
    <span class="app-empty-state__icon" aria-hidden="true"><i :class="iconClass" /></span>
    <p class="app-empty-state__title">{{ title }}</p>
    <p v-if="description" class="app-empty-state__description">{{ description }}</p>
    <div v-if="$slots.default" class="app-empty-state__actions">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.app-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--ns-space-2);
  padding: var(--ns-space-8) var(--ns-space-4);
}

.app-empty-state__icon {
  display: grid;
  place-items: center;
  width: 3.5rem;
  height: 3.5rem;
  margin-bottom: var(--ns-space-2);
  border-radius: 999px;
  background: var(--ns-surface-hover);
  color: var(--ns-text-muted);
  font-size: 1.5rem;
}

.app-empty-state--error .app-empty-state__icon {
  background: color-mix(in srgb, var(--p-red-500) 12%, transparent);
  color: var(--p-red-500);
}

.app-empty-state__title {
  margin: 0;
  font-weight: 600;
  font-size: var(--ns-text-lg);
}

.app-empty-state__description {
  margin: 0;
  max-width: 28rem;
  color: var(--ns-text-muted);
}

.app-empty-state__actions {
  margin-top: var(--ns-space-3);
  display: flex;
  gap: var(--ns-space-2);
}
</style>
