import { Icon } from '@/shared/constants/icons';
import type { AppModule } from '@/shared/types/module';

export { useSessionStore, type SessionStore } from './stores/session';
export { createAuthBridge, type SessionEndHandlers } from './bridge';
export { safeRedirect, strongPasswordSchema } from './schemas/auth.schemas';
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
    {
      path: '/register',
      name: 'register',
      component: () => import('./pages/RegisterPage.vue'),
      meta: { public: true, guestOnly: true, title: 'Crear negocio' },
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
  navigation: [
    {
      id: 'admin',
      label: 'Administración',
      panel: 'business',
      order: 50,
      items: [{ label: 'Mi cuenta', icon: Icon.account, to: { name: 'account' } }],
    },
    {
      id: 'account',
      label: 'Cuenta',
      panel: 'platform',
      order: 90,
      items: [{ label: 'Mi cuenta', icon: Icon.account, to: { name: 'account' } }],
    },
  ],
};
