<script setup lang="ts">
import ConfirmDialog from 'primevue/confirmdialog';
</script>

<template>
  <!-- Single global instance; open it through useConfirmAction(). -->
  <ConfirmDialog :draggable="false" :style="{ width: '28rem' }" :breakpoints="{ '640px': '95vw' }" />
</template>
