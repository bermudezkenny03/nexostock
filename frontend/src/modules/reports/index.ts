import { Icon } from '@/shared/constants/icons';
import { Permission } from '@/shared/constants/permissions';
import type { AppModule } from '@/shared/types/module';

export { useReportsOverview, useLowStock, useSalesSeries, useTopProducts, reportKeys } from './composables/useReports';
export type { ReportsOverview, LowStockItem, SalesSeries, TopProduct, DateRange } from './types';

export const reportsModule: AppModule = {
  id: 'reports',
  shellRoutes: [
    {
      path: '/app/reports',
      name: 'reports',
      component: () => import('./pages/ReportsPage.vue'),
      meta: { panel: 'business', permissions: [Permission.REPORTS_VIEW], title: 'Reportes' },
    },
  ],
  navigation: [
    {
      id: 'reports',
      label: 'Reportes',
      panel: 'business',
      order: 40,
      items: [{ label: 'Resumen', icon: Icon.reports, to: { name: 'reports' }, permissions: [Permission.REPORTS_VIEW] }],
    },
  ],
};
