import type {
  Category,
  CategoryChanges,
  NewCategory,
  NewProduct,
  Product,
  ProductChanges,
  ProductListCriteria,
  ProductPage,
  ProductQuote,
} from './catalog';

export const CATEGORY_REPOSITORY = Symbol('CategoryRepository');
export const PRODUCT_REPOSITORY = Symbol('ProductRepository');

export interface CategoryRepository {
  list(businessId: string): Promise<Category[]>;
  findInBusiness(id: string, businessId: string): Promise<Category | null>;
  findActive(id: string, businessId: string): Promise<Category | null>;
  create(data: NewCategory): Promise<Category>;
  update(id: string, changes: CategoryChanges): Promise<Category>;
}

export interface ProductRepository {
  search(criteria: ProductListCriteria): Promise<ProductPage>;
  findInBusiness(id: string, businessId: string): Promise<Product | null>;
  countActive(businessId: string): Promise<number>;
  create(data: NewProduct): Promise<Product>;
  update(id: string, changes: ProductChanges): Promise<Product>;
  delete(id: string): Promise<void>;
  quote(
    businessId: string,
    productIds: string[],
    includeInactive: boolean,
  ): Promise<ProductQuote[]>;
  summary(businessId: string): Promise<{ active: number; total: number }>;
}
