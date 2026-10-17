import { Icon } from '@/shared/constants/icons';
import { Permission } from '@/shared/constants/permissions';
import type { AppModule } from '@/shared/types/module';

export { salesKeys, useSalesList, useSale, useCreateSale, useCancelSale } from './composables/useSales';
export type { Sale, SaleStatus, SaleListQuery } from './types';

export const salesModule: AppModule = {
  id: 'sales',
  shellRoutes: [
    {
      path: '/app/sales',
      name: 'sales',
      component: () => import('./pages/SalesPage.vue'),
      meta: { panel: 'business', permissions: [Permission.SALES_VIEW, Permission.REPORTS_VIEW], title: 'Ventas' },
    },
  ],
  navigation: [
    {
      id: 'sales',
      label: 'Ventas',
      panel: 'business',
      order: 30,
      items: [{ label: 'Historial', icon: Icon.sales, to: { name: 'sales' }, permissions: [Permission.SALES_VIEW, Permission.REPORTS_VIEW] }],
    },
  ],
};
