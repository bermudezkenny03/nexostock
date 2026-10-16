import { useQuery } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { stockApi } from '../api/stockApi';

export const inventoryKeys = {
  all: ['inventory'] as const,
  stock: (productId: string) => [...inventoryKeys.all, 'stock', productId] as const,
};

export function useProductStock(productId: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => inventoryKeys.stock(toValue(productId) ?? '')),
    queryFn: () => stockApi.get(toValue(productId)!),
    enabled: computed(() => Boolean(toValue(productId))),
  });
}
