import { VueQueryPlugin } from '@tanstack/vue-query';
import { mount, type ComponentMountingOptions } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import Tooltip from 'primevue/tooltip';
import { defineComponent, h, type Component } from 'vue';
import { createMemoryHistory, createRouter, type RouteRecordRaw, type Router } from 'vue-router';
import { createQueryClient } from '@/shared/api';
import { createPermissionChecker, PERMISSION_CHECKER } from '@/shared/composables/usePermissions';

export interface MountAppOptions<C> {
  permissions?: string[];
  routes?: RouteRecordRaw[];
  initialPath?: string;
  mountOptions?: ComponentMountingOptions<C>;
}

const Blank = defineComponent({ render: () => h('div') });

/** Mounts a component with the same plugins the app installs (PrimeVue, Pinia, Vue Query, router, permissions). */
export async function mountWithApp<C extends Component>(component: C, options: MountAppOptions<C> = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false, staleTime: 0 } });
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: options.routes ?? [{ path: '/:pathMatch(.*)*', name: 'any', component: Blank }],
  });
  await router.push(options.initialPath ?? '/');
  await router.isReady();

  const granted = new Set(options.permissions ?? []);
  const wrapper = mount(component, {
    ...options.mountOptions,
    attachTo: document.body,
    global: {
      plugins: [pinia, router, [VueQueryPlugin, { queryClient }], PrimeVue, ToastService, ConfirmationService],
      directives: { tooltip: Tooltip },
      provide: { [PERMISSION_CHECKER as symbol]: createPermissionChecker(() => granted) },
      ...options.mountOptions?.global,
    },
  } as ComponentMountingOptions<C>);

  return { wrapper, router, queryClient, pinia };
}

export function flushAll(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
