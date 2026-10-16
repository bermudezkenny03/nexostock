import type { AppModule } from '@/shared/types/module';

export const dashboardModule: AppModule = {
  id: 'dashboard',
  shellRoutes: [
    {
      path: '/app',
      name: 'dashboard',
      component: () => import('./pages/DashboardPage.vue'),
      meta: { panel: 'business', title: 'Panel' },
    },
  ],
  navigation: [
    {
      id: 'general',
      label: 'General',
      panel: 'business',
      order: 0,
      items: [{ label: 'Panel', icon: 'pi pi-home', to: { name: 'dashboard' } }],
    },
  ],
};
