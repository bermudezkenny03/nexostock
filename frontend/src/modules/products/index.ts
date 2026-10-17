import { Icon } from '@/shared/constants/icons';
import { Permission } from '@/shared/constants/permissions';
import type { AppModule } from '@/shared/types/module';

export { productKeys, categoryKeys, useProductList, useCategories, useProductLookup } from './composables/useProducts';
export type { Product, Category } from './types';

/** Same read permissions as GET /products and GET /categories. */
const CATALOG_READ = [Permission.PRODUCTS_VIEW, Permission.SALES_VIEW] as const;

export const productsModule: AppModule = {
  id: 'products',
  shellRoutes: [
    {
      path: '/app/products',
      name: 'products',
      component: () => import('./pages/ProductsPage.vue'),
      meta: { panel: 'business', permissions: CATALOG_READ, title: 'Productos' },
    },
    {
      path: '/app/categories',
      name: 'categories',
      component: () => import('./pages/CategoriesPage.vue'),
      meta: { panel: 'business', permissions: CATALOG_READ, title: 'Categorías' },
    },
  ],
  navigation: [
    {
      id: 'catalog',
      label: 'Catálogo',
      panel: 'business',
      order: 10,
      items: [
        { label: 'Productos', icon: Icon.products, to: { name: 'products' }, permissions: CATALOG_READ },
        { label: 'Categorías', icon: Icon.categories, to: { name: 'categories' }, permissions: CATALOG_READ },
      ],
    },
  ],
};
