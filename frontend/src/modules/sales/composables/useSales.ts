import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { inventoryKeys } from '@/modules/inventory';
import { reportKeys } from '@/modules/reports';
import { salesApi } from '../api/salesApi';
import type { CreateSalePayload, SaleListQuery } from '../types';

export const salesKeys = {
  all: ['sales'] as const,
  list: (query: SaleListQuery) => [...salesKeys.all, 'list', query] as const,
  detail: (id: string) => [...salesKeys.all, 'detail', id] as const,
};

export function useSalesList(query: MaybeRefOrGetter<SaleListQuery>, enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: computed(() => salesKeys.list(toValue(query))),
    queryFn: () => salesApi.list(toValue(query)),
    placeholderData: (previous) => previous,
    enabled: computed(() => toValue(enabled)),
  });
}

export function useSale(id: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => salesKeys.detail(toValue(id) ?? '')),
    queryFn: () => salesApi.get(toValue(id)!),
    enabled: computed(() => Boolean(toValue(id))),
  });
}

function useInvalidateSales() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: salesKeys.all }),
      client.invalidateQueries({ queryKey: reportKeys.all }),
      client.invalidateQueries({ queryKey: inventoryKeys.all }),
    ]);
}

export function useCreateSale() {
  const invalidate = useInvalidateSales();
  return useMutation({
    mutationFn: (payload: CreateSalePayload) => salesApi.create(payload),
    onSuccess: () => invalidate(),
  });
}

export function useCancelSale() {
  const invalidate = useInvalidateSales();
  return useMutation({
    mutationFn: (id: string) => salesApi.cancel(id),
    onSuccess: () => invalidate(),
  });
}
