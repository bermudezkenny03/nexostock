<!--
  Ported from Sakai Vue src/views/pages/NotFound.vue.
  Sakai Vue © PrimeTek, MIT License — see src/assets/sakai/LICENSE.md.
-->
<script setup lang="ts">
import Button from 'primevue/button';
import AppLogo from '../layout/AppLogo.vue';
import FloatingConfigurator from '../layout/FloatingConfigurator.vue';
</script>

<template>
  <FloatingConfigurator />
  <div class="flex items-center justify-center min-h-screen overflow-hidden">
    <div class="flex flex-col items-center justify-center">
      <AppLogo class="mb-8 w-32 shrink-0" />
      <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, color-mix(in srgb, var(--primary-color), transparent 60%) 10%, var(--surface-ground) 30%)">
        <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20 flex flex-col items-center" style="border-radius: 53px">
          <span class="text-primary font-bold text-3xl">404</span>
          <h1 class="text-surface-900 dark:text-surface-0 font-bold text-3xl lg:text-5xl mb-2">No encontrada</h1>
          <div class="text-surface-600 dark:text-surface-200 mb-8">La dirección que buscas no existe o fue movida.</div>
          <router-link to="/" class="w-full flex items-center py-8 border-surface-300 dark:border-surface-500 border-b">
            <span class="flex justify-center items-center border-2 border-primary text-primary rounded-border" style="height: 3.5rem; width: 3.5rem">
              <i class="pi pi-fw pi-home text-2xl!" />
            </span>
            <span class="ml-6 flex flex-col">
              <span class="text-surface-900 dark:text-surface-0 lg:text-xl font-medium mb-0 block">Panel</span>
              <span class="text-surface-600 dark:text-surface-200 lg:text-xl">Volver al inicio de tu negocio.</span>
            </span>
          </router-link>
          <router-link to="/login" class="w-full flex items-center mb-8 py-8 border-surface-300 dark:border-surface-500 border-b">
            <span class="flex justify-center items-center border-2 border-primary text-primary rounded-border" style="height: 3.5rem; width: 3.5rem">
              <i class="pi pi-fw pi-sign-in text-2xl!" />
            </span>
            <span class="ml-6 flex flex-col">
              <span class="text-surface-900 dark:text-surface-0 lg:text-xl font-medium mb-0">Iniciar sesión</span>
              <span class="text-surface-600 dark:text-surface-200 lg:text-xl">Accede de nuevo a NexoStock.</span>
            </span>
          </router-link>
          <Button as="router-link" label="Ir al inicio" to="/" />
        </div>
      </div>
    </div>
  </div>
</template>
