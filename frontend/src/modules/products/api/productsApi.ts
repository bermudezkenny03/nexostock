import { http, type Page } from '@/shared/api';
import type {
  Category,
  CreateCategoryPayload,
  CreateProductPayload,
  Product,
  ProductListQuery,
  UpdateCategoryPayload,
  UpdateProductPayload,
} from '../types';

function compactQuery(query: ProductListQuery): ProductListQuery {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== '' && value !== null),
  ) as ProductListQuery;
}

export const productsApi = {
  async list(query: ProductListQuery): Promise<Page<Product>> {
    const { data } = await http.get<Page<Product>>('/products', { params: compactQuery(query) });
    return data;
  },

  async create(payload: CreateProductPayload): Promise<Product> {
    const { data } = await http.post<Product>('/products', payload);
    return data;
  },

  async update(id: string, payload: UpdateProductPayload): Promise<Product> {
    const { data } = await http.patch<Product>(`/products/${encodeURIComponent(id)}`, payload);
    return data;
  },
};

export const categoriesApi = {
  /** Returns active and inactive categories; the endpoint is not paginated. */
  async list(): Promise<Category[]> {
    const { data } = await http.get<Category[]>('/categories');
    return data;
  },

  async create(payload: CreateCategoryPayload): Promise<Category> {
    const { data } = await http.post<Category>('/categories', payload);
    return data;
  },

  async update(id: string, payload: UpdateCategoryPayload): Promise<Category> {
    const { data } = await http.patch<Category>(`/categories/${encodeURIComponent(id)}`, payload);
    return data;
  },
};
