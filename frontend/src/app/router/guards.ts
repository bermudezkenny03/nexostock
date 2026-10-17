import type { RouteLocationNormalized, RouteLocationRaw, Router } from 'vue-router';
import type { Panel } from '@/shared/types/navigation';

export interface GuardSession {
  readonly isAuthenticated: boolean;
  readonly panel: Panel;
  can(codes: readonly string[]): boolean;
  restore(): Promise<void>;
}

export function homeRouteFor(panel: Panel): RouteLocationRaw {
  return { name: panel === 'platform' ? 'platform-home' : 'dashboard' };
}

/**
 * Pure navigation decision. It only hides UI the user cannot use; every API
 * call is still authorized by the backend.
 */
export function resolveAccess(to: RouteLocationNormalized, session: GuardSession): true | RouteLocationRaw {
  const { meta } = to;

  if (meta.public) {
    return meta.guestOnly && session.isAuthenticated ? homeRouteFor(session.panel) : true;
  }

  if (!session.isAuthenticated) {
    return { name: 'login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } };
  }

  if (meta.panel && meta.panel !== session.panel) {
    return homeRouteFor(session.panel);
  }

  if (meta.permissions?.length && !session.can(meta.permissions)) {
    return { name: 'forbidden', query: { from: to.fullPath } };
  }

  return true;
}

export function installGuards(router: Router, session: GuardSession): void {
  router.beforeEach(async (to) => {
    await session.restore();
    return resolveAccess(to, session);
  });

  router.afterEach((to) => {
    document.title = to.meta.title ? `${to.meta.title} · NexoStock` : 'NexoStock';
  });
}
