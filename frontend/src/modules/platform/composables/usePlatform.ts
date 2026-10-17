import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { platformApi } from '../api/platformApi';
import type { PlatformBusinessQuery, UpdatePlatformPlan } from '../types';

export const platformKeys = {
  all: ['platform'] as const,
  businesses: (query: PlatformBusinessQuery) => [...platformKeys.all, 'businesses', query] as const,
  plans: () => [...platformKeys.all, 'plans'] as const,
  planRequests: () => [...platformKeys.all, 'plan-requests'] as const,
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

function useInvalidatePlatform() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: platformKeys.all });
}

export function useSetBusinessStatus() {
  const invalidate = useInvalidatePlatform();
  return useMutation({
    mutationFn: ({ businessId, isActive, reason }: { businessId: string; isActive: boolean; reason?: string }) =>
      platformApi.setStatus(businessId, isActive, reason),
    onSuccess: () => invalidate(),
  });
}

export function usePlanRequests() {
  return useQuery({ queryKey: platformKeys.planRequests(), queryFn: platformApi.listPlanRequests });
}

export function useDecidePlanRequest() {
  const invalidate = useInvalidatePlatform();
  return useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) => platformApi.decidePlanRequest(id, approve),
    onSuccess: () => invalidate(),
  });
}

export function useUpdatePlatformPlan() {
  const invalidate = useInvalidatePlatform();
  return useMutation({
    mutationFn: ({ code, body }: { code: string; body: UpdatePlatformPlan }) => platformApi.updatePlan(code, body),
    onSuccess: () => invalidate(),
  });
}

export function useChangeBusinessPlan() {
  const invalidate = useInvalidatePlatform();
  return useMutation({
    mutationFn: ({ businessId, planCode }: { businessId: string; planCode: string }) => platformApi.changePlan(businessId, planCode),
    onSuccess: () => invalidate(),
  });
}
