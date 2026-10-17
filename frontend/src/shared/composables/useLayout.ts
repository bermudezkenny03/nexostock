/*
 * Layout and theme state ported from Sakai Vue (src/layout/composables/layout.js).
 * Sakai Vue © PrimeTek, MIT License — see src/assets/sakai/LICENSE.md.
 * NexoStock additions: TypeScript types and persisting the configuration in localStorage.
 */
import { computed, reactive, watch } from 'vue';

export type PresetName = 'Aura' | 'Lara' | 'Nora';
export type MenuMode = 'static' | 'overlay';

export interface LayoutConfig {
  preset: PresetName;
  primary: string;
  surface: string | null;
  darkTheme: boolean;
  menuMode: MenuMode;
}

export interface LayoutState {
  staticMenuInactive: boolean;
  overlayMenuActive: boolean;
  profileSidebarVisible: boolean;
  configSidebarVisible: boolean;
  sidebarExpanded: boolean;
  menuHoverActive: boolean;
  mobileMenuActive: boolean;
  anchored: boolean;
  activeMenuItem: string | null;
  activePath: string | null;
}

export const LAYOUT_STORAGE_KEY = 'nexostock.layout';
const DARK_CLASS = 'app-dark';

const DEFAULT_CONFIG: LayoutConfig = {
  preset: 'Aura',
  primary: 'emerald',
  surface: null,
  darkTheme: false,
  menuMode: 'static',
};

function loadConfig(): LayoutConfig {
  const prefersDark = typeof window !== 'undefined' && (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  try {
    const stored = JSON.parse(window.localStorage.getItem(LAYOUT_STORAGE_KEY) ?? 'null') as Partial<LayoutConfig> | null;
    if (stored) {
      return { ...DEFAULT_CONFIG, ...stored };
    }
  } catch {
    // storage unavailable or corrupted: use defaults
  }
  return { ...DEFAULT_CONFIG, darkTheme: prefersDark };
}

const layoutConfig = reactive<LayoutConfig>(loadConfig());

const layoutState = reactive<LayoutState>({
  staticMenuInactive: false,
  overlayMenuActive: false,
  profileSidebarVisible: false,
  configSidebarVisible: false,
  sidebarExpanded: false,
  menuHoverActive: false,
  mobileMenuActive: false,
  anchored: false,
  activeMenuItem: null,
  activePath: null,
});

watch(
  layoutConfig,
  (config) => {
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(config));
    } catch {
      // the configuration still applies for this session
    }
  },
  { deep: true },
);

function applyDarkClass(): void {
  document.documentElement.classList.toggle(DARK_CLASS, layoutConfig.darkTheme);
}

export function useLayout() {
  const executeDarkModeToggle = () => {
    layoutConfig.darkTheme = !layoutConfig.darkTheme;
    applyDarkClass();
  };

  const toggleDarkMode = () => {
    if (!document.startViewTransition) {
      executeDarkModeToggle();
      return;
    }
    document.startViewTransition(() => executeDarkModeToggle());
  };

  const isDesktop = () => window.innerWidth > 991;

  const toggleMenu = () => {
    if (isDesktop()) {
      if (layoutConfig.menuMode === 'static') {
        layoutState.staticMenuInactive = !layoutState.staticMenuInactive;
      }
      if (layoutConfig.menuMode === 'overlay') {
        layoutState.overlayMenuActive = !layoutState.overlayMenuActive;
      }
    } else {
      layoutState.mobileMenuActive = !layoutState.mobileMenuActive;
    }
  };

  const toggleConfigSidebar = () => {
    layoutState.configSidebarVisible = !layoutState.configSidebarVisible;
  };

  const hideMobileMenu = () => {
    layoutState.mobileMenuActive = false;
  };

  const changeMenuMode = (mode: MenuMode) => {
    layoutConfig.menuMode = mode;
    layoutState.staticMenuInactive = false;
    layoutState.mobileMenuActive = false;
    layoutState.sidebarExpanded = false;
    layoutState.menuHoverActive = false;
    layoutState.anchored = false;
  };

  const isDarkTheme = computed(() => layoutConfig.darkTheme);
  const hasOpenOverlay = computed(() => layoutState.overlayMenuActive);
  const isSidebarVisible = computed(() =>
    isDesktop()
      ? layoutConfig.menuMode === 'static'
        ? !layoutState.staticMenuInactive
        : layoutState.overlayMenuActive
      : layoutState.mobileMenuActive,
  );

  return {
    layoutConfig,
    layoutState,
    isDarkTheme,
    isSidebarVisible,
    toggleDarkMode,
    toggleConfigSidebar,
    toggleMenu,
    hideMobileMenu,
    changeMenuMode,
    isDesktop,
    hasOpenOverlay,
    syncDarkClass: applyDarkClass,
  };
}
