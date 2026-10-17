import { Icon } from '@/shared/constants/icons';
import type { AppModule } from '@/shared/types/module';

export { default as BestSellingWidget } from './components/BestSellingWidget.vue';
export { default as NotificationsWidget } from './components/NotificationsWidget.vue';
export { default as RecentSalesWidget } from './components/RecentSalesWidget.vue';
export { default as RevenueStreamWidget } from './components/RevenueStreamWidget.vue';
export { default as StatsWidget } from './components/StatsWidget.vue';

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
      items: [{ label: 'Panel', icon: Icon.dashboard, to: { name: 'dashboard' } }],
    },
  ],
};
