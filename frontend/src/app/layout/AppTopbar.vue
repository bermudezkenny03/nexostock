<!--
  Ported from Sakai Vue src/layout/AppTopbar.vue.
  NexoStock: product name, real account/logout actions. Calendar/Messages of the
  demo were omitted because those modules do not exist.
  Sakai Vue © PrimeTek, MIT License — see src/assets/sakai/LICENSE.md.
-->
<script setup lang="ts">
import type { MenuItem } from 'primevue/menuitem';
import Menu from 'primevue/menu';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '@/modules/auth';
import { useLayout } from '@/shared/composables/useLayout';
import AppConfigurator from './AppConfigurator.vue';
import AppLogo from './AppLogo.vue';

const { toggleMenu, toggleDarkMode, isDarkTheme } = useLayout();
const session = useSessionStore();
const router = useRouter();
const userMenu = ref<InstanceType<typeof Menu> | null>(null);

const brand = computed(() => session.user?.businessName ?? 'NexoStock');

const menuItems = computed<MenuItem[]>(() => [
  {
    label: session.displayName,
    items: [
      { label: 'Mi cuenta', icon: 'pi pi-user', command: () => router.push({ name: 'account' }) },
      {
        label: 'Cerrar sesión',
        icon: 'pi pi-sign-out',
        command: async () => {
          await session.logout();
          await router.replace({ name: 'login' });
        },
      },
    ],
  },
]);

function openUserMenu(event: Event): void {
  userMenu.value?.toggle(event);
}
</script>

<template>
  <div class="layout-topbar">
    <div class="layout-topbar-logo-container">
      <button class="layout-menu-button layout-topbar-action" type="button" aria-label="Mostrar u ocultar menú" @click="toggleMenu">
        <i class="pi pi-bars" />
      </button>
      <router-link to="/" class="layout-topbar-logo">
        <AppLogo />
        <span>{{ brand }}</span>
      </router-link>
    </div>

    <div class="layout-topbar-actions">
      <div class="layout-config-menu">
        <button
          type="button"
          class="layout-topbar-action"
          :aria-label="isDarkTheme ? 'Activar modo claro' : 'Activar modo oscuro'"
          :aria-pressed="isDarkTheme"
          @click="toggleDarkMode"
        >
          <i :class="['pi', { 'pi-moon': isDarkTheme, 'pi-sun': !isDarkTheme }]" />
        </button>
        <div class="relative">
          <button
            v-styleclass="{
              selector: '@next',
              enterFromClass: 'hidden',
              enterActiveClass: 'p-anchored-overlay-enter-active',
              leaveToClass: 'hidden',
              leaveActiveClass: 'p-anchored-overlay-leave-active',
              hideOnOutsideClick: true,
            }"
            type="button"
            class="layout-topbar-action layout-topbar-action-highlight"
            aria-label="Personalizar tema"
          >
            <i class="pi pi-palette" />
          </button>
          <AppConfigurator />
        </div>
      </div>

      <button
        v-styleclass="{
          selector: '@next',
          enterFromClass: 'hidden',
          enterActiveClass: 'p-anchored-overlay-enter-active',
          leaveToClass: 'hidden',
          leaveActiveClass: 'p-anchored-overlay-leave-active',
          hideOnOutsideClick: true,
        }"
        class="layout-topbar-menu-button layout-topbar-action"
        type="button"
        aria-label="Más acciones"
      >
        <i class="pi pi-ellipsis-v" />
      </button>

      <div class="layout-topbar-menu hidden lg:block">
        <div class="layout-topbar-menu-content">
          <button
            type="button"
            class="layout-topbar-action"
            :aria-label="`Menú de usuario: ${session.displayName}`"
            aria-haspopup="true"
            aria-controls="user-menu"
            @click="openUserMenu"
          >
            <i class="pi pi-user" />
            <span>Perfil</span>
          </button>
        </div>
      </div>
      <Menu id="user-menu" ref="userMenu" :model="menuItems" popup />
    </div>
  </div>
</template>
