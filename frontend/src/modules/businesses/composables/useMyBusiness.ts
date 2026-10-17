import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { businessApi } from '../api/businessApi';

export const businessKeys = {
  all: ['business'] as const,
  mine: () => [...businessKeys.all, 'me'] as const,
  planRequest: () => [...businessKeys.all, 'plan-request'] as const,
  publicPlans: () => [...businessKeys.all, 'public-plans'] as const,
};

export function useMyBusiness() {
  return useQuery({
    queryKey: businessKeys.mine(),
    queryFn: businessApi.getMine,
  });
}

export function useMyPlanRequest() {
  return useQuery({
    queryKey: businessKeys.planRequest(),
    queryFn: businessApi.getPlanRequest,
  });
}

export function usePublicPlans() {
  return useQuery({
    queryKey: businessKeys.publicPlans(),
    queryFn: businessApi.listPublicPlans,
  });
}

export function useRequestPlanChange() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (planCode: string) => businessApi.requestPlanChange(planCode),
    onSuccess: () => client.invalidateQueries({ queryKey: businessKeys.all }),
  });
}
