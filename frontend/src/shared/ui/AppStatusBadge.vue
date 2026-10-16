<script setup lang="ts">
import Tag from 'primevue/tag';
import { computed } from 'vue';

type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

interface StatusStyle {
  label: string;
  severity: Severity;
}

const DEFAULT_STATUSES: Record<string, StatusStyle> = {
  ACTIVE: { label: 'Activo', severity: 'success' },
  INACTIVE: { label: 'Inactivo', severity: 'secondary' },
  PENDING: { label: 'Pendiente', severity: 'warn' },
  CONFIRMED: { label: 'Confirmada', severity: 'success' },
  FAILED: { label: 'Fallida', severity: 'danger' },
  CANCELLED: { label: 'Cancelada', severity: 'secondary' },
  SUSPENDED: { label: 'Suspendido', severity: 'danger' },
};

const props = defineProps<{
  /** Status code (e.g. `CONFIRMED`) or a boolean active flag. */
  status: string | boolean;
  statuses?: Record<string, StatusStyle>;
}>();

const style = computed<StatusStyle>(() => {
  const key = typeof props.status === 'boolean' ? (props.status ? 'ACTIVE' : 'INACTIVE') : props.status;
  return props.statuses?.[key] ?? DEFAULT_STATUSES[key] ?? { label: key, severity: 'info' };
});
</script>

<template>
  <Tag :value="style.label" :severity="style.severity" rounded />
</template>
