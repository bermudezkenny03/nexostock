import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { reportKeys } from '@/modules/reports';
import { stockApi } from '../api/stockApi';
import type { CreateMovementPayload, StockListQuery, UpdateMinQuantityPayload } from '../types';

export const inventoryKeys = {
  all: ['inventory'] as const,
  stock: (productId: string) => [...inventoryKeys.all, 'stock', productId] as const,
  list: (query: StockListQuery) => [...inventoryKeys.all, 'list', query] as const,
  movements: (query: StockListQuery) => [...inventoryKeys.all, 'movements', query] as const,
  alerts: () => [...inventoryKeys.all, 'alerts'] as const,
};

export function useProductStock(productId: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => inventoryKeys.stock(toValue(productId) ?? '')),
    queryFn: () => stockApi.get(toValue(productId)!),
    enabled: computed(() => Boolean(toValue(productId))),
  });
}

export function useStockList(query: MaybeRefOrGetter<StockListQuery>) {
  return useQuery({
    queryKey: computed(() => inventoryKeys.list(toValue(query))),
    queryFn: () => stockApi.list(toValue(query)),
    placeholderData: (previous) => previous,
  });
}

export function useStockAlerts(enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: inventoryKeys.alerts(),
    queryFn: stockApi.alerts,
    enabled: computed(() => toValue(enabled)),
  });
}

export function useMovements(query: MaybeRefOrGetter<StockListQuery>) {
  return useQuery({
    queryKey: computed(() => inventoryKeys.movements(toValue(query))),
    queryFn: () => stockApi.movements(toValue(query)),
    placeholderData: (previous) => previous,
  });
}

function useInvalidateInventory() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: inventoryKeys.all }),
      client.invalidateQueries({ queryKey: reportKeys.all }),
    ]);
}

export function useUpdateMinQuantity() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: ({ productId, payload }: { productId: string; payload: UpdateMinQuantityPayload }) =>
      stockApi.updateMin(productId, payload),
    onSuccess: () => invalidate(),
  });
}

export function useCreateMovement() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (payload: CreateMovementPayload) => stockApi.move(payload),
    onSuccess: () => invalidate(),
  });
}
