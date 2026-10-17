<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
    <div class="min-w-0">
      <h4 class="m-0">{{ title }}</h4>
      <p v-if="subtitle || $slots.subtitle" class="text-muted-color mt-1 mb-0">
        <slot name="subtitle">{{ subtitle }}</slot>
      </p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
