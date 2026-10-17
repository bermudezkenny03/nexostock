<!--
  Ported from Sakai Vue src/layout/AppConfigurator.vue.
  Sakai Vue © PrimeTek, MIT License — see src/assets/sakai/LICENSE.md.
-->
<script setup lang="ts">
import SelectButton from 'primevue/selectbutton';
import { ref } from 'vue';
import { applyPrimary, applySurface, applyThemeConfig, primaryColors, surfaces } from '@/app/providers/theme';
import type { ColorOption } from '@/app/providers/theme';
import { useLayout, type MenuMode, type PresetName } from '@/shared/composables/useLayout';

const { layoutConfig, isDarkTheme, changeMenuMode } = useLayout();

const preset = ref<PresetName>(layoutConfig.preset);
const presetOptions = ref<PresetName[]>(['Aura', 'Lara', 'Nora']);

const menuMode = ref<MenuMode>(layoutConfig.menuMode);
const menuModeOptions = ref([
  { label: 'Static', value: 'static' },
  { label: 'Overlay', value: 'overlay' },
]);

function updateColors(type: 'primary' | 'surface', color: ColorOption): void {
  if (type === 'primary') {
    layoutConfig.primary = color.name;
    applyPrimary(color.name);
  } else {
    layoutConfig.surface = color.name;
    applySurface(color.name);
  }
}

function onPresetChange(): void {
  layoutConfig.preset = preset.value;
  applyThemeConfig(layoutConfig);
}

function onMenuModeChange(): void {
  changeMenuMode(menuMode.value);
}
</script>

<template>
  <div
    class="config-panel hidden absolute top-[3.25rem] right-0 w-64 p-4 bg-surface-0 dark:bg-surface-900 border border-surface rounded-border origin-top shadow-[0px_3px_5px_rgba(0,0,0,0.02),0px_0px_2px_rgba(0,0,0,0.05),0px_1px_4px_rgba(0,0,0,0.08)]"
  >
    <div class="flex flex-col gap-4">
      <div>
        <span class="text-sm text-muted-color font-semibold">Primary</span>
        <div class="pt-2 flex gap-2 flex-wrap justify-between">
          <button
            v-for="primaryColor of primaryColors"
            :key="primaryColor.name"
            type="button"
            :title="primaryColor.name"
            :class="['border-none w-5 h-5 rounded-full p-0 cursor-pointer outline-none outline-offset-1', { 'outline-primary': layoutConfig.primary === primaryColor.name }]"
            :style="{ backgroundColor: `${primaryColor.name === 'noir' ? 'var(--text-color)' : primaryColor.palette['500']}` }"
            @click="updateColors('primary', primaryColor)"
          />
        </div>
      </div>
      <div>
        <span class="text-sm text-muted-color font-semibold">Surface</span>
        <div class="pt-2 flex gap-2 flex-wrap justify-between">
          <button
            v-for="surface of surfaces"
            :key="surface.name"
            type="button"
            :title="surface.name"
            :class="[
              'border-none w-5 h-5 rounded-full p-0 cursor-pointer outline-none outline-offset-1',
              { 'outline-primary': layoutConfig.surface ? layoutConfig.surface === surface.name : isDarkTheme ? surface.name === 'zinc' : surface.name === 'slate' },
            ]"
            :style="{ backgroundColor: `${surface.palette['500']}` }"
            @click="updateColors('surface', surface)"
          />
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <span class="text-sm text-muted-color font-semibold">Presets</span>
        <SelectButton v-model="preset" :options="presetOptions" :allow-empty="false" @change="onPresetChange" />
      </div>
      <div class="flex flex-col gap-2">
        <span class="text-sm text-muted-color font-semibold">Menu Mode</span>
        <SelectButton
          v-model="menuMode"
          :options="menuModeOptions"
          :allow-empty="false"
          option-label="label"
          option-value="value"
          @change="onMenuModeChange"
        />
      </div>
    </div>
  </div>
</template>
