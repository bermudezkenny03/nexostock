import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { appModules } from '../modules';

const AppShell = () => import('../layouts/AppShell.vue');
const AuthLayout = () => import('../layouts/AuthLayout.vue');

export function buildRoutes(): RouteRecordRaw[] {
  return [
    {
      path: '/',
      component: AuthLayout,
      children: appModules.flatMap((module) => module.publicRoutes ?? []),
    },
    {
      path: '/',
      component: AppShell,
      children: [
        // Resolved by the guard to the home of the user's panel.
        { path: '', name: 'home', redirect: { name: 'dashboard' } },
        ...appModules.flatMap((module) => module.shellRoutes ?? []),
        {
          path: '/403',
          name: 'forbidden',
          component: () => import('../pages/ForbiddenPage.vue'),
          meta: { title: 'Acceso denegado' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../pages/NotFoundPage.vue'),
      meta: { public: true, title: 'Página no encontrada' },
    },
  ];
}

export function createAppRouter() {
  return createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: buildRoutes(),
    scrollBehavior: () => ({ top: 0 }),
  });
}
