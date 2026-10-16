import { Permission } from '@/shared/constants/permissions';
import type { AppModule } from '@/shared/types/module';

export const platformModule: AppModule = {
  id: 'platform',
  shellRoutes: [
    {
      path: '/platform',
      name: 'platform-home',
      component: () => import('./pages/PlatformHomePage.vue'),
      meta: { panel: 'platform', permissions: [Permission.PLATFORM_MANAGE], title: 'Plataforma' },
    },
  ],
  navigation: [
    {
      id: 'platform',
      label: 'Plataforma',
      panel: 'platform',
      order: 0,
      items: [
        {
          label: 'Resumen',
          icon: 'pi pi-chart-bar',
          to: { name: 'platform-home' },
          permissions: [Permission.PLATFORM_MANAGE],
        },
      ],
    },
  ],
};
