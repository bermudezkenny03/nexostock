import type { QueryClient } from '@tanstack/vue-query';
import type { Pinia } from 'pinia';
import { watch, type App } from 'vue';
import type { Router } from 'vue-router';
import { createAuthBridge, useSessionStore, type SessionEndReason } from '@/modules/auth';
import { configureAuthBridge } from '@/shared/api';
import { createPermissionChecker, PERMISSION_CHECKER } from '@/shared/composables/usePermissions';
import { installGuards } from '../router/guards';

export function installSession(app: App, deps: { pinia: Pinia; router: Router; queryClient: QueryClient }): void {
  const { router, queryClient } = deps;
  const session = useSessionStore(deps.pinia);

  app.provide(
    PERMISSION_CHECKER,
    createPermissionChecker(() => session.permissions),
  );

  function endSession(reason: SessionEndReason): void {
    const current = router.currentRoute.value;
    if (!session.isAuthenticated && current.name === 'login') {
      return;
    }
    session.clear();
    void router.replace({
      name: 'login',
      query: { reason, ...(current.meta.public || current.name === undefined ? {} : { redirect: current.fullPath }) },
    });
  }

  configureAuthBridge(
    createAuthBridge({
      onSessionExpired: () => endSession('expired'),
      onBusinessSuspended: () => endSession('suspended'),
    }),
  );

  // Cached data belongs to the tenant of the previous session.
  watch(
    () => session.isAuthenticated,
    (authenticated) => {
      if (!authenticated) {
        queryClient.clear();
      }
    },
  );

  installGuards(router, session);
}
