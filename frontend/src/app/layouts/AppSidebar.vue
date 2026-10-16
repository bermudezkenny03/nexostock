<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useSessionStore } from '@/modules/auth';
import { usePermissions } from '@/shared/composables/usePermissions';
import { navigationFor } from '../modules';

const emit = defineEmits<{ navigate: [] }>();

const session = useSessionStore();
const { can } = usePermissions();

const sections = computed(() =>
  navigationFor(session.panel)
    .map((section) => ({ ...section, items: section.items.filter((item) => can(item.permissions ?? [])) }))
    .filter((section) => section.items.length > 0),
);
</script>

<template>
  <nav aria-label="Navegación principal">
    <ul class="layout-menu">
      <li v-for="section in sections" :key="section.id" class="layout-menu-section">
        <p :id="`menu-section-${section.id}`" class="layout-menu-section-label">{{ section.label }}</p>
        <ul class="layout-menu" :aria-labelledby="`menu-section-${section.id}`">
          <li v-for="item in section.items" :key="item.label">
            <RouterLink :to="item.to" class="layout-menu-link" @click="emit('navigate')">
              <i :class="item.icon" aria-hidden="true" />
              <span>{{ item.label }}</span>
            </RouterLink>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>
