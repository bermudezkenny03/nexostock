<!--
  Ported from Sakai Vue src/layout/AppLayout.vue.
  Sakai Vue © PrimeTek, MIT License — see src/assets/sakai/LICENSE.md.
-->
<script setup lang="ts">
import { computed, watch } from 'vue';
import { useLayout } from '@/shared/composables/useLayout';
import AppFooter from './AppFooter.vue';
import AppSidebar from './AppSidebar.vue';
import AppTopbar from './AppTopbar.vue';

const { layoutConfig, layoutState, hideMobileMenu } = useLayout();

const containerClass = computed(() => ({
  'layout-overlay': layoutConfig.menuMode === 'overlay',
  'layout-static': layoutConfig.menuMode === 'static',
  'layout-overlay-active': layoutState.overlayMenuActive,
  'layout-mobile-active': layoutState.mobileMenuActive,
  'layout-static-inactive': layoutState.staticMenuInactive,
}));

watch(
  () => layoutState.mobileMenuActive,
  (active) => {
    document.body.classList.toggle('blocked-scroll', active);
  },
);
</script>

<template>
  <div class="layout-wrapper" :class="containerClass">
    <a href="#main-content" class="skip-link">Saltar al contenido</a>
    <AppTopbar />
    <AppSidebar />
    <div class="layout-main-container">
      <div id="main-content" class="layout-main" tabindex="-1">
        <router-view />
      </div>
      <AppFooter />
    </div>
    <div class="layout-mask animate-fadein" @click="hideMobileMenu" />
  </div>
</template>
