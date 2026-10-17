import { Icon } from '@/shared/constants/icons';
import { Permission } from '@/shared/constants/permissions';
import type { AppModule } from '@/shared/types/module';

export { inventoryKeys, useProductStock, useStockList, useStockAlerts, useMovements } from './composables/useStock';
export type { StockView, Movement } from './types';

const INVENTORY_READ = [Permission.INVENTORY_VIEW, Permission.PRODUCTS_VIEW, Permission.SALES_VIEW] as const;

export const inventoryModule: AppModule = {
  id: 'inventory',
  shellRoutes: [
    {
      path: '/app/inventory',
      name: 'inventory',
      component: () => import('./pages/StockPage.vue'),
      meta: { panel: 'business', permissions: INVENTORY_READ, title: 'Inventario' },
    },
    {
      path: '/app/inventory/movements',
      name: 'inventory-movements',
      component: () => import('./pages/MovementsPage.vue'),
      meta: { panel: 'business', permissions: [Permission.INVENTORY_VIEW, Permission.PRODUCTS_VIEW], title: 'Movimientos' },
    },
  ],
  navigation: [
    {
      id: 'inventory',
      label: 'Inventario',
      panel: 'business',
      order: 20,
      items: [
        { label: 'Existencias', icon: Icon.inventory, to: { name: 'inventory' }, permissions: INVENTORY_READ },
        {
          label: 'Movimientos',
          icon: Icon.movements,
          to: { name: 'inventory-movements' },
          permissions: [Permission.INVENTORY_VIEW, Permission.PRODUCTS_VIEW],
        },
      ],
    },
  ],
};
