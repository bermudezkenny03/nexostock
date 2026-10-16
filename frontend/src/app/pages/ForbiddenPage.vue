<script setup lang="ts">
import Button from 'primevue/button';
import { RouterLink } from 'vue-router';
import AppEmptyState from '@/shared/ui/AppEmptyState.vue';
</script>

<template>
  <div class="ns-card">
    <AppEmptyState
      variant="error"
      icon="pi pi-lock"
      title="Acceso denegado"
      description="Tu rol o tu plan no incluyen permiso para ver esta sección. Si crees que es un error, contacta al propietario del negocio."
    >
      <RouterLink v-slot="{ navigate }" :to="{ name: 'home' }" custom>
        <Button label="Ir al inicio" icon="pi pi-home" @click="navigate" />
      </RouterLink>
    </AppEmptyState>
  </div>
</template>
