<!--
  Ported from Sakai Vue src/layout/AppMenu.vue.
  Menu model is built from NexoStock modules and filtered by real permissions.
  Sakai Vue © PrimeTek, MIT License — see src/assets/sakai/LICENSE.md.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { navigationFor } from '@/app/modules';
import { useSessionStore } from '@/modules/auth';
import { usePermissions } from '@/shared/composables/usePermissions';
import type { NavItem } from '@/shared/types/navigation';
import AppMenuItem from './AppMenuItem.vue';
import type { SakaiMenuItem } from './types';

const session = useSessionStore();
const { can } = usePermissions();

function toSakaiItem(item: NavItem): SakaiMenuItem | null {
  if (!can(item.permissions ?? [])) {
    return null;
  }
  const children = item.items?.map(toSakaiItem).filter((child): child is SakaiMenuItem => child !== null);
  if (item.items && (children?.length ?? 0) === 0) {
    return null;
  }
  return {
    label: item.label,
    icon: item.icon,
    to: item.to,
    path: item.path,
    disabled: item.disabled,
    items: children && children.length > 0 ? children : undefined,
  };
}

const model = computed<SakaiMenuItem[]>(() =>
  navigationFor(session.panel)
    .map((section) => ({
      label: section.label,
      items: section.items.map(toSakaiItem).filter((item): item is SakaiMenuItem => item !== null),
    }))
    .filter((section) => (section.items?.length ?? 0) > 0),
);
</script>

<template>
  <ul class="layout-menu">
    <template v-for="(item, i) in model" :key="item.label + '_' + i">
      <AppMenuItem v-if="!item.separator" :item="item" :root="true" />
      <li v-else class="menu-separator" />
    </template>
  </ul>
</template>
