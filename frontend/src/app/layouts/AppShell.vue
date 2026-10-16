<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import AppSidebar from './AppSidebar.vue';
import AppTopbar from './AppTopbar.vue';
import { useLayout } from './useLayout';

const layout = useLayout();
const route = useRoute();

watch(() => route.fullPath, layout.closeMobile);

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && layout.mobileOpen.value) {
    layout.closeMobile();
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div
    class="layout-wrapper"
    :class="{ 'sidebar-collapsed': layout.collapsed.value, 'sidebar-mobile-open': layout.mobileOpen.value }"
  >
    <a href="#main-content" class="skip-link">Saltar al contenido</a>
    <AppTopbar :sidebar-visible="layout.sidebarVisible.value" @toggle-sidebar="layout.toggleSidebar" />
    <aside id="app-sidebar" class="layout-sidebar" :inert="!layout.sidebarVisible.value || undefined">
      <AppSidebar @navigate="layout.closeMobile" />
    </aside>
    <div class="layout-mask" aria-hidden="true" @click="layout.closeMobile" />
    <main id="main-content" class="layout-main" tabindex="-1">
      <div class="layout-content">
        <RouterView />
      </div>
    </main>
  </div>
</template>
