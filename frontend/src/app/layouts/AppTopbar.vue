<script setup lang="ts">
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import Tag from 'primevue/tag';
import type { MenuItem } from 'primevue/menuitem';
import { computed, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useSessionStore } from '@/modules/auth';
import { useTheme } from '@/shared/composables/useTheme';
import { initials } from '@/shared/utils/format';

defineProps<{ sidebarVisible: boolean }>();
const emit = defineEmits<{ toggleSidebar: [] }>();

const session = useSessionStore();
const router = useRouter();
const theme = useTheme();
const userMenu = ref<InstanceType<typeof Menu> | null>(null);

const userInitials = computed(
  () => initials(session.user?.firstName, session.user?.lastName) || session.user?.email[0]?.toUpperCase() || '?',
);

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
</script>

<template>
  <header class="layout-topbar">
    <Button
      icon="pi pi-bars"
      text
      rounded
      severity="secondary"
      aria-label="Mostrar u ocultar menú"
      aria-controls="app-sidebar"
      :aria-expanded="sidebarVisible"
      @click="emit('toggleSidebar')"
    />
    <RouterLink :to="{ name: 'home' }" class="layout-topbar-brand">
      <span class="layout-topbar-logo" aria-hidden="true">N</span>
      <span class="truncate">{{ session.user?.businessName ?? 'NexoStock' }}</span>
    </RouterLink>
    <span v-if="session.isPlatform" class="hidden sm:inline-flex">
      <Tag value="Plataforma" severity="contrast" />
    </span>

    <div class="layout-topbar-actions">
      <Button
        :icon="theme.isDark.value ? 'pi pi-sun' : 'pi pi-moon'"
        text
        rounded
        severity="secondary"
        :aria-label="theme.isDark.value ? 'Activar modo claro' : 'Activar modo oscuro'"
        :aria-pressed="theme.isDark.value"
        @click="theme.toggle"
      />
      <Button
        text
        rounded
        severity="secondary"
        class="gap-2"
        aria-haspopup="true"
        aria-controls="user-menu"
        :aria-label="`Menú de usuario: ${session.displayName}`"
        @click="userMenu?.toggle($event)"
      >
        <Avatar :label="userInitials" shape="circle" aria-hidden="true" />
        <span class="hidden max-w-40 truncate md:inline">{{ session.displayName }}</span>
        <i class="pi pi-angle-down" aria-hidden="true" />
      </Button>
      <Menu id="user-menu" ref="userMenu" :model="menuItems" popup />
    </div>
  </header>
</template>
