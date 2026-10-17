import { http } from '@/shared/api';
import { compactParams } from '@/shared/utils/query';
import type { PlatformBusiness, PlatformBusinessPage, PlatformBusinessQuery, PlatformPlan, PlatformPlanRequest, UpdatePlatformPlan } from '../types';

export const platformApi = {
  async listBusinesses(query: PlatformBusinessQuery = {}): Promise<PlatformBusinessPage> {
    const { data } = await http.get<PlatformBusinessPage>('/platform/businesses', { params: compactParams(query) });
    return data;
  },

  async listPlans(): Promise<PlatformPlan[]> {
    const { data } = await http.get<PlatformPlan[]>('/platform/plans');
    return data;
  },

  async setStatus(businessId: string, isActive: boolean, reason?: string): Promise<PlatformBusiness> {
    const { data } = await http.patch<PlatformBusiness>(`/platform/businesses/${encodeURIComponent(businessId)}/status`, {
      isActive,
      ...(reason ? { reason } : {}),
    });
    return data;
  },

  async listPlanRequests(): Promise<PlatformPlanRequest[]> {
    const { data } = await http.get<PlatformPlanRequest[]>('/platform/plan-requests');
    return data;
  },

  async decidePlanRequest(id: string, approve: boolean): Promise<void> {
    await http.post(`/platform/plan-requests/${encodeURIComponent(id)}/decision`, { approve });
  },

  async updatePlan(code: string, body: UpdatePlatformPlan): Promise<PlatformPlan> {
    const { data } = await http.patch<PlatformPlan>(`/platform/plans/${encodeURIComponent(code)}`, body);
    return data;
  },

  async changePlan(businessId: string, planCode: string): Promise<PlatformBusiness> {
    const { data } = await http.patch<PlatformBusiness>(`/platform/businesses/${encodeURIComponent(businessId)}/plan`, { planCode });
    return data;
  },
};
