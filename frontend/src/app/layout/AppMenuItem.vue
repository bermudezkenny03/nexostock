<!--
  Ported from Sakai Vue src/layout/AppMenuItem.vue.
  Sakai Vue © PrimeTek, MIT License — see src/assets/sakai/LICENSE.md.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { useLayout } from '@/shared/composables/useLayout';
import type { SakaiMenuItem } from './types';

const { layoutState, isDesktop } = useLayout();

const props = withDefaults(
  defineProps<{
    item: SakaiMenuItem;
    root?: boolean;
    parentPath?: string | null;
  }>(),
  { root: true, parentPath: null },
);

const fullPath = computed(() =>
  props.item.path ? (props.parentPath ? props.parentPath + props.item.path : props.item.path) : null,
);

const isActive = computed(() =>
  props.item.path ? layoutState.activePath?.startsWith(fullPath.value ?? '') : layoutState.activePath === String(props.item.to ?? ''),
);

const itemClick = (event: Event, item: SakaiMenuItem) => {
  if (item.disabled) {
    event.preventDefault();
    return;
  }

  if (item.command) {
    item.command({ originalEvent: event, item });
  }

  if (item.items) {
    if (isActive.value) {
      layoutState.activePath = (layoutState.activePath ?? '').replace(item.path ?? '', '');
    } else {
      layoutState.activePath = fullPath.value;
      layoutState.menuHoverActive = true;
    }
  } else {
    layoutState.overlayMenuActive = false;
    layoutState.mobileMenuActive = false;
    layoutState.menuHoverActive = false;
  }
};

const onMouseEnter = () => {
  if (isDesktop() && props.root && props.item.items && layoutState.menuHoverActive) {
    layoutState.activePath = fullPath.value;
  }
};
</script>

<template>
  <li :class="{ 'layout-root-menuitem': root, 'active-menuitem': isActive }">
    <div v-if="root && item.visible !== false" class="layout-menuitem-root-text">{{ item.label }}</div>
    <a
      v-if="(!item.to || item.items) && item.visible !== false"
      :href="item.url"
      :class="item.class"
      :target="item.target"
      tabindex="0"
      @click="itemClick($event, item)"
      @mouseenter="onMouseEnter"
    >
      <i :class="item.icon" class="layout-menuitem-icon" />
      <span class="layout-menuitem-text">{{ item.label }}</span>
      <i v-if="item.items" class="pi pi-fw pi-angle-down layout-submenu-toggler" />
    </a>
    <router-link
      v-if="item.to && !item.items && item.visible !== false"
      exact-active-class="active-route"
      :class="item.class"
      tabindex="0"
      :to="item.to"
      @click="itemClick($event, item)"
      @mouseenter="onMouseEnter"
    >
      <i :class="item.icon" class="layout-menuitem-icon" />
      <span class="layout-menuitem-text">{{ item.label }}</span>
      <i v-if="item.items" class="pi pi-fw pi-angle-down layout-submenu-toggler" />
    </router-link>
    <Transition v-if="item.items && item.visible !== false" name="layout-submenu">
      <ul v-show="root ? true : isActive" class="layout-submenu">
        <AppMenuItem
          v-for="child in item.items"
          :key="child.label + '_' + (child.to ?? child.path ?? child.label)"
          :item="child"
          :root="false"
          :parent-path="fullPath"
        />
      </ul>
    </Transition>
  </li>
</template>
