<!--
  Ported from Sakai Vue src/components/FloatingConfigurator.vue.
  Sakai Vue © PrimeTek, MIT License — see src/assets/sakai/LICENSE.md.
-->
<script setup lang="ts">
import Button from 'primevue/button';
import { useLayout } from '@/shared/composables/useLayout';
import AppConfigurator from './AppConfigurator.vue';

const { toggleDarkMode, isDarkTheme } = useLayout();
</script>

<template>
  <div class="fixed flex gap-4 top-8 right-8">
    <Button type="button" rounded severity="secondary" :icon="isDarkTheme ? 'pi pi-moon' : 'pi pi-sun'" :aria-label="isDarkTheme ? 'Activar modo claro' : 'Activar modo oscuro'" @click="toggleDarkMode" />
    <div class="relative">
      <Button
        v-styleclass="{ selector: '@next', enterFromClass: 'hidden', enterActiveClass: 'animate-scalein', leaveToClass: 'hidden', leaveActiveClass: 'animate-fadeout', hideOnOutsideClick: true }"
        icon="pi pi-palette"
        type="button"
        rounded
        aria-label="Personalizar tema"
      />
      <AppConfigurator />
    </div>
  </div>
</template>
