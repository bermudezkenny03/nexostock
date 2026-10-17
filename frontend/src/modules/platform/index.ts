import { Icon } from '@/shared/constants/icons';
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
    {
      path: '/platform/businesses',
      name: 'platform-businesses',
      component: () => import('./pages/PlatformBusinessesPage.vue'),
      meta: { panel: 'platform', permissions: [Permission.PLATFORM_MANAGE], title: 'Negocios' },
    },
    {
      path: '/platform/plans',
      name: 'platform-plans',
      component: () => import('./pages/PlatformPlansPage.vue'),
      meta: { panel: 'platform', permissions: [Permission.PLATFORM_MANAGE], title: 'Planes' },
    },
  ],
  navigation: [
    {
      id: 'platform',
      label: 'Plataforma',
      panel: 'platform',
      order: 0,
      items: [
        { label: 'Resumen', icon: Icon.platform, to: { name: 'platform-home' }, permissions: [Permission.PLATFORM_MANAGE] },
        { label: 'Negocios', icon: Icon.businesses, to: { name: 'platform-businesses' }, permissions: [Permission.PLATFORM_MANAGE] },
        { label: 'Planes', icon: Icon.plans, to: { name: 'platform-plans' }, permissions: [Permission.PLATFORM_MANAGE] },
      ],
    },
  ],
};
