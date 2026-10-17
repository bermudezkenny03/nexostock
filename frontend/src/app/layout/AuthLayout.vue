<!--
  Login chrome from Sakai Vue src/views/pages/auth/Login.vue.
  Sakai Vue © PrimeTek, MIT License — see src/assets/sakai/LICENSE.md.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppLogo from './AppLogo.vue';
import FloatingConfigurator from './FloatingConfigurator.vue';

const route = useRoute();
const isRegister = computed(() => route.name === 'register');
</script>

<template>
  <FloatingConfigurator />
  <div v-if="isRegister" class="min-h-screen overflow-auto bg-surface-50 dark:bg-surface-950">
    <header class="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-6 sm:px-6">
      <AppLogo compact />
      <span class="text-xl font-medium text-surface-900 dark:text-surface-0">NexoStock</span>
    </header>
    <main class="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
      <router-view />
    </main>
  </div>
  <div v-else class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden">
    <div class="flex flex-col items-center justify-center">
      <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
        <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
          <div class="text-center mb-8">
            <AppLogo compact class="mb-8 mx-auto" />
            <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">Bienvenido a NexoStock</div>
            <span class="text-muted-color font-medium">Accede al panel de tu negocio</span>
          </div>
          <router-view />
        </div>
      </div>
    </div>
  </div>
</template>
