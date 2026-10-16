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
  <div class="app-form-field">
    <label :for="id" class="app-form-field__label">
      {{ label }}
      <span v-if="required" class="app-form-field__required" aria-hidden="true">*</span>
    </label>
    <slot v-bind="{ id, invalid: Boolean(error), describedBy }" />
    <small v-if="hint && !error" :id="`${id}-hint`" class="ns-muted">{{ hint }}</small>
    <small v-if="error" :id="`${id}-error`" class="app-form-field__error" role="alert">{{ error }}</small>
  </div>
</template>

<style scoped>
.app-form-field {
  display: flex;
  flex-direction: column;
  gap: var(--ns-space-2);
}

.app-form-field__label {
  font-weight: 600;
}

.app-form-field__required {
  color: var(--p-red-500);
  margin-left: 2px;
}

.app-form-field__error {
  color: var(--p-red-500);
}
</style>
