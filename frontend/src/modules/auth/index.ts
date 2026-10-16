import type { AppModule } from '@/shared/types/module';

export { useSessionStore, type SessionStore } from './stores/session';
export { createAuthBridge, type SessionEndHandlers } from './bridge';
export { safeRedirect } from './schemas/auth.schemas';
export type { AuthUser, SessionEndReason, SessionStatus } from './types';

export const authModule: AppModule = {
  id: 'auth',
  publicRoutes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('./pages/LoginPage.vue'),
      meta: { public: true, guestOnly: true, title: 'Iniciar sesión' },
    },
  ],
  shellRoutes: [
    {
      path: '/account',
      name: 'account',
      component: () => import('./pages/AccountPage.vue'),
      meta: { title: 'Mi cuenta' },
    },
  ],
};
