import { computed, ref } from 'vue';

const DESKTOP_QUERY = '(min-width: 992px)';
const COLLAPSED_KEY = 'nexostock.sidebar.collapsed';

const desktopQuery = typeof window !== 'undefined' ? window.matchMedia?.(DESKTOP_QUERY) : undefined;
const desktop = ref(desktopQuery?.matches ?? true);
const collapsed = ref(readCollapsed());
const mobileOpen = ref(false);

desktopQuery?.addEventListener?.('change', (event) => {
  desktop.value = event.matches;
  if (event.matches) {
    mobileOpen.value = false;
  }
});

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Sidebar state adapted from Sakai's `useLayout`: static collapse on desktop, overlay on mobile. */
export function useLayout() {
  function toggleSidebar(): void {
    if (desktop.value) {
      collapsed.value = !collapsed.value;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, String(collapsed.value));
      } catch {
        // preference only
      }
    } else {
      mobileOpen.value = !mobileOpen.value;
    }
  }

  return {
    collapsed: computed(() => desktop.value && collapsed.value),
    mobileOpen: computed(() => !desktop.value && mobileOpen.value),
    sidebarVisible: computed(() => (desktop.value ? !collapsed.value : mobileOpen.value)),
    toggleSidebar,
    closeMobile: () => {
      mobileOpen.value = false;
    },
  };
}
