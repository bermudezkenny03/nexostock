import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const palette = (name: string) =>
  Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((s) => [s, `{${name}.${s}}`]));

/** Brand preset: teal primary (matches the seeded business color #0F766E), slate surfaces. */
export const NexoStockPreset = definePreset(Aura, {
  semantic: {
    primary: palette('teal'),
    colorScheme: {
      light: {
        surface: { 0: '#ffffff', ...palette('slate') },
        primary: {
          color: '{primary.700}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.800}',
          activeColor: '{primary.900}',
        },
        highlight: {
          background: '{primary.50}',
          focusBackground: '{primary.100}',
          color: '{primary.800}',
          focusColor: '{primary.900}',
        },
      },
      dark: {
        surface: { 0: '#ffffff', ...palette('slate') },
        primary: {
          color: '{primary.400}',
          contrastColor: '{surface.950}',
          hoverColor: '{primary.300}',
          activeColor: '{primary.200}',
        },
        highlight: {
          background: 'color-mix(in srgb, {primary.400}, transparent 84%)',
          focusBackground: 'color-mix(in srgb, {primary.400}, transparent 76%)',
          color: 'rgba(255,255,255,.87)',
          focusColor: 'rgba(255,255,255,.87)',
        },
      },
    },
  },
});
