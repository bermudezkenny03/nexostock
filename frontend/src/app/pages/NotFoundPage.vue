<script setup lang="ts">
import Button from 'primevue/button';
import { RouterLink } from 'vue-router';
import AppEmptyState from '@/shared/ui/AppEmptyState.vue';
</script>

<template>
  <main class="grid min-h-screen place-items-center p-6">
    <div class="ns-card w-full max-w-lg">
      <AppEmptyState
        icon="pi pi-compass"
        title="Página no encontrada"
        description="La dirección que buscas no existe o fue movida."
      >
        <RouterLink v-slot="{ navigate }" :to="{ name: 'home' }" custom>
          <Button label="Volver al inicio" icon="pi pi-home" @click="navigate" />
        </RouterLink>
      </AppEmptyState>
    </div>
  </main>
</template>
