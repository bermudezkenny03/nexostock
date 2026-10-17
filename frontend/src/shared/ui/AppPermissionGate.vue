<script setup lang="ts">
import { computed } from 'vue';
import { usePermissions } from '../composables/usePermissions';

const props = withDefaults(
  defineProps<{
    permissions: readonly string[] | string;
    /** `any` mirrors the backend's @RequirePermissions OR semantics. */
    mode?: 'any' | 'all';
  }>(),
  { mode: 'any' },
);

const checker = usePermissions();

const allowed = computed(() => {
  if (props.mode === 'all') {
    return checker.canAll(typeof props.permissions === 'string' ? [props.permissions] : props.permissions);
  }
  return checker.can(props.permissions);
});
</script>

<template>
  <slot v-if="allowed" />
  <slot v-else name="fallback" />
</template>
