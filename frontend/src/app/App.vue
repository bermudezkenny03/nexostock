<script setup lang="ts">
import Toast from 'primevue/toast';
import { RouterView } from 'vue-router';
import AppConfirmDialog from '@/shared/ui/AppConfirmDialog.vue';
</script>

<template>
  <RouterView />
  <Toast position="top-right" />
  <AppConfirmDialog />
</template>
