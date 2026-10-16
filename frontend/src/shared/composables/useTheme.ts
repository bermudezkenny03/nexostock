import { computed, ref } from 'vue';

const STORAGE_KEY = 'nexostock.theme';
const DARK_CLASS = 'app-dark';

function initialDark(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return stored === 'dark';
    }
  } catch {
    // storage unavailable: fall back to system preference
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

const isDark = ref(initialDark());

function apply(dark: boolean): void {
  document.documentElement.classList.toggle(DARK_CLASS, dark);
}

export function useTheme() {
  function setDark(dark: boolean): void {
    isDark.value = dark;
    apply(dark);
    try {
      window.localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
    } catch {
      // preference is still applied for this session
    }
  }

  return {
    isDark: computed(() => isDark.value),
    toggle: () => setDark(!isDark.value),
    setDark,
    sync: () => apply(isDark.value),
  };
}
