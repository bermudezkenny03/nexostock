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
    class="flex flex-col items-center text-center gap-2 py-8 px-4"
    :role="variant === 'error' ? 'alert' : 'status'"
  >
    <span
      class="flex items-center justify-center w-14 h-14 mb-2 rounded-full"
      :class="variant === 'error' ? 'bg-red-100 dark:bg-red-400/10 text-red-500' : 'bg-surface-100 dark:bg-surface-800 text-muted-color'"
      aria-hidden="true"
    >
      <i :class="[iconClass, 'text-2xl']" />
    </span>
    <p class="font-semibold text-lg m-0">{{ title }}</p>
    <p v-if="description" class="text-muted-color m-0 max-w-md">{{ description }}</p>
    <div v-if="$slots.default" class="mt-3 flex gap-2">
      <slot />
    </div>
  </div>
</template>
