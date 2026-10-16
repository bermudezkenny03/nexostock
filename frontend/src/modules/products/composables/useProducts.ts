import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { inventoryKeys } from '@/modules/inventory';
import { reportKeys } from '@/modules/reports';
import { categoriesApi, productsApi } from '../api/productsApi';
import type {
  CreateCategoryPayload,
  CreateProductPayload,
  ProductListQuery,
  UpdateCategoryPayload,
  UpdateProductPayload,
} from '../types';

export const productKeys = {
  all: ['products'] as const,
  list: (query: ProductListQuery) => [...productKeys.all, 'list', query] as const,
};

export const categoryKeys = {
  all: ['categories'] as const,
};

export function useProductList(query: MaybeRefOrGetter<ProductListQuery>) {
  return useQuery({
    queryKey: computed(() => productKeys.list(toValue(query))),
    queryFn: () => productsApi.list(toValue(query)),
    placeholderData: (previous) => previous,
  });
}

export function useCategories() {
  return useQuery({ queryKey: categoryKeys.all, queryFn: categoriesApi.list });
}

function useInvalidateCatalog() {
  const client = useQueryClient();
  return (options: { categories?: boolean } = {}) =>
    Promise.all([
      client.invalidateQueries({ queryKey: productKeys.all }),
      client.invalidateQueries({ queryKey: reportKeys.all }),
      client.invalidateQueries({ queryKey: inventoryKeys.all }),
      options.categories ? client.invalidateQueries({ queryKey: categoryKeys.all }) : Promise.resolve(),
    ]);
}

export function useCreateProduct() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: (payload: CreateProductPayload) => productsApi.create(payload),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateProduct() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductPayload }) => productsApi.update(id, payload),
    onSuccess: () => invalidate(),
  });
}

export function useCreateCategory() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) => categoriesApi.create(payload),
    onSuccess: () => invalidate({ categories: true }),
  });
}

export function useUpdateCategory() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCategoryPayload }) => categoriesApi.update(id, payload),
    // Product rows embed the category name, so they are refreshed too.
    onSuccess: () => invalidate({ categories: true }),
  });
}
