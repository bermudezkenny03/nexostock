import { Icon } from '@/shared/constants/icons';
import type { AppModule } from '@/shared/types/module';

export { useMyBusiness, businessKeys } from './composables/useMyBusiness';
export type { BusinessProfile, Plan } from './types';

export const businessesModule: AppModule = {
  id: 'businesses',
  shellRoutes: [
    {
      path: '/app/plan',
      name: 'business-plan',
      component: () => import('./pages/PlanPage.vue'),
      meta: { panel: 'business', title: 'Mi plan' },
    },
  ],
  navigation: [
    {
      id: 'admin',
      label: 'Administración',
      panel: 'business',
      order: 50,
      items: [{ label: 'Mi plan', icon: Icon.plans, to: { name: 'business-plan' } }],
    },
  ],
};
