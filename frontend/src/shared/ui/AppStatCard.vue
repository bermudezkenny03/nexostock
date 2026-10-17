<script setup lang="ts">
import Skeleton from 'primevue/skeleton';

withDefaults(
  defineProps<{
    label: string;
    value?: string | number | null;
    icon?: string;
    hint?: string;
    loading?: boolean;
    tone?: 'blue' | 'orange' | 'cyan' | 'purple';
  }>(),
  { value: null, icon: undefined, hint: undefined, loading: false, tone: 'blue' },
);

const tones = {
  blue: { wrap: 'bg-blue-100 dark:bg-blue-400/10', icon: 'text-blue-500' },
  orange: { wrap: 'bg-orange-100 dark:bg-orange-400/10', icon: 'text-orange-500' },
  cyan: { wrap: 'bg-cyan-100 dark:bg-cyan-400/10', icon: 'text-cyan-500' },
  purple: { wrap: 'bg-purple-100 dark:bg-purple-400/10', icon: 'text-purple-500' },
};
</script>

<template>
  <div class="card mb-0" :aria-busy="loading">
    <div class="flex justify-between mb-4">
      <div>
        <span class="block text-muted-color font-medium mb-4">{{ label }}</span>
        <Skeleton v-if="loading" width="6rem" height="1.5rem" />
        <div v-else class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ value ?? '—' }}</div>
      </div>
      <div
        v-if="icon"
        class="flex items-center justify-center rounded-border"
        :class="tones[tone].wrap"
        style="width: 2.5rem; height: 2.5rem"
        aria-hidden="true"
      >
        <i :class="[icon, tones[tone].icon, 'text-xl!']" />
      </div>
    </div>
    <p v-if="hint || $slots.default" class="text-muted-color m-0">
      <slot>{{ hint }}</slot>
    </p>
  </div>
</template>
