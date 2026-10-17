import { useQuery } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { reportsApi } from '../api/reportsApi';
import type { DateRange } from '../types';

export const reportKeys = {
  all: ['reports'] as const,
  overview: (range: DateRange = {}) => [...reportKeys.all, 'overview', range] as const,
  lowStock: () => [...reportKeys.all, 'low-stock'] as const,
  sales: (range: DateRange = {}) => [...reportKeys.all, 'sales', range] as const,
  topProducts: (range: DateRange = {}) => [...reportKeys.all, 'top-products', range] as const,
};

export function useReportsOverview(enabled: MaybeRefOrGetter<boolean> = true, range: MaybeRefOrGetter<DateRange> = {}) {
  return useQuery({
    queryKey: computed(() => reportKeys.overview(toValue(range))),
    queryFn: () => reportsApi.overview(toValue(range)),
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

export function useSalesSeries(enabled: MaybeRefOrGetter<boolean> = true, range: MaybeRefOrGetter<DateRange> = {}) {
  return useQuery({
    queryKey: computed(() => reportKeys.sales(toValue(range))),
    queryFn: () => reportsApi.sales(toValue(range)),
    enabled: computed(() => toValue(enabled)),
  });
}

export function useTopProducts(enabled: MaybeRefOrGetter<boolean> = true, range: MaybeRefOrGetter<DateRange> = {}) {
  return useQuery({
    queryKey: computed(() => reportKeys.topProducts(toValue(range))),
    queryFn: () => reportsApi.topProducts(toValue(range)),
    enabled: computed(() => toValue(enabled)),
  });
}
