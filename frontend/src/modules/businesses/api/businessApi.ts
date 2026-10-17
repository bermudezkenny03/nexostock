import { http } from '@/shared/api';
import type { BusinessProfile, MyPlanRequest, PublicPlanOption } from '../types';

export const businessApi = {
  /** Tenant is derived from the JWT; the client never sends a businessId. */
  async getMine(): Promise<BusinessProfile> {
    const { data } = await http.get<BusinessProfile>('/business/me');
    return data;
  },

  async getPlanRequest(): Promise<MyPlanRequest | null> {
    const { data } = await http.get<MyPlanRequest | null>('/business/me/plan-request');
    return data;
  },

  async requestPlanChange(planCode: string): Promise<MyPlanRequest> {
    const { data } = await http.post<MyPlanRequest>('/business/me/plan-request', { planCode });
    return data;
  },

  async listPublicPlans(): Promise<PublicPlanOption[]> {
    const { data } = await http.get<PublicPlanOption[]>('/auth/plans');
    return data;
  },
};
