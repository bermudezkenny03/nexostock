<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    id: string;
    label: string;
    error?: string;
    hint?: string;
    required?: boolean;
  }>(),
  { error: undefined, hint: undefined, required: false },
);

const describedBy = computed(() =>
  [props.error ? `${props.id}-error` : null, props.hint ? `${props.id}-hint` : null].filter(Boolean).join(' ') ||
  undefined,
);
</script>

<template>
  <div class="flex flex-col gap-2">
    <label :for="id" class="block text-surface-900 dark:text-surface-0 font-medium">
      {{ label }}
      <span v-if="required" class="text-red-500 ml-0.5" aria-hidden="true">*</span>
    </label>
    <slot v-bind="{ id, invalid: Boolean(error), describedBy }" />
    <small v-if="hint && !error" :id="`${id}-hint`" class="text-muted-color">{{ hint }}</small>
    <small v-if="error" :id="`${id}-error`" class="text-red-500" role="alert">{{ error }}</small>
  </div>
</template>
