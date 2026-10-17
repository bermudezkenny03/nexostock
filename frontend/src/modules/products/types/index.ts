/**
 * Hand-written: products-service DTOs have no @ApiProperty schemas, so its
 * OpenAPI document has no models. Source: infrastructure/http/dto/product.dto.ts
 * and domain/catalog.ts.
 */
export interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  /** Decimal(12,2) serialized as string, e.g. "12.50". */
  price: string;
  isActive: boolean;
  category: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListQuery {
  search?: string;
  categoryId?: string;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateProductPayload {
  sku: string;
  name: string;
  description?: string;
  categoryId?: string;
  price: string;
  minQuantity?: number;
}

export interface UpdateProductPayload {
  sku?: string;
  name?: string;
  description?: string;
  categoryId?: string | null;
  price?: string;
  isActive?: boolean;
  minQuantity?: number;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
}

export interface UpdateCategoryPayload {
  name?: string;
  description?: string;
  isActive?: boolean;
}
