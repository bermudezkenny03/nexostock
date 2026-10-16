import { useQuery } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { reportsApi } from '../api/reportsApi';

export const reportKeys = {
  all: ['reports'] as const,
  overview: () => [...reportKeys.all, 'overview'] as const,
  lowStock: () => [...reportKeys.all, 'low-stock'] as const,
};

export function useReportsOverview(enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: reportKeys.overview(),
    queryFn: () => reportsApi.overview(),
    enabled: computed(() => toValue(enabled)),
  });
}

export function useLowStock(enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: reportKeys.lowStock(),
    queryFn: reportsApi.lowStock,
    enabled: computed(() => toValue(enabled)),
  });
}
