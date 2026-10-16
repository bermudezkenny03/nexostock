export interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCategoryRef {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price: string;
  isActive: boolean;
  category: ProductCategoryRef | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductQuote {
  id: string;
  sku: string;
  name: string;
  price: string;
  isActive: boolean;
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NewCategory {
  businessId: string;
  name: string;
  description: string | null;
}

export interface CategoryChanges {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface NewProduct {
  businessId: string;
  sku: string;
  name: string;
  description: string | null;
  categoryId?: string;
  price: string;
}

export interface ProductChanges {
  sku?: string;
  name?: string;
  description?: string | null;
  price?: string;
  isActive?: boolean;
  categoryId?: string | null;
}

export interface ProductListCriteria {
  businessId: string;
  includeInactive?: boolean;
  categoryId?: string;
  search?: string;
  page: number;
  pageSize: number;
}

export class UniqueConstraintError extends Error {
  constructor() {
    super('unique');
    this.name = 'UniqueConstraintError';
  }
}
