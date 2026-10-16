import { useQuery } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { platformApi } from '../api/platformApi';
import type { PlatformBusinessQuery } from '../types';

export const platformKeys = {
  all: ['platform'] as const,
  businesses: (query: PlatformBusinessQuery) => [...platformKeys.all, 'businesses', query] as const,
  plans: () => [...platformKeys.all, 'plans'] as const,
};

export function usePlatformBusinesses(query: MaybeRefOrGetter<PlatformBusinessQuery>) {
  return useQuery({
    queryKey: computed(() => platformKeys.businesses(toValue(query))),
    queryFn: () => platformApi.listBusinesses(toValue(query)),
    placeholderData: (previous) => previous,
  });
}

export function usePlatformPlans() {
  return useQuery({ queryKey: platformKeys.plans(), queryFn: platformApi.listPlans });
}
