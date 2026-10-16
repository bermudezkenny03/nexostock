<script setup lang="ts">
import Dialog from 'primevue/dialog';

withDefaults(
  defineProps<{
    title: string;
    /** Blocks closing while a request is in flight. */
    busy?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  { busy: false, size: 'md' },
);

const visible = defineModel<boolean>('visible', { required: true });

const widths = { sm: '26rem', md: '36rem', lg: '52rem' } as const;
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="title"
    modal
    :closable="!busy"
    :close-on-escape="!busy"
    :draggable="false"
    :style="{ width: widths[size] }"
    :breakpoints="{ '640px': '95vw' }"
  >
    <slot />
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </Dialog>
</template>
