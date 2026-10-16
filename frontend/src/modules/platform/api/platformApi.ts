import { http } from '@/shared/api';
import type { PlatformBusinessPage, PlatformBusinessQuery, PlatformPlan } from '../types';

export const platformApi = {
  async listBusinesses(query: PlatformBusinessQuery = {}): Promise<PlatformBusinessPage> {
    const { data } = await http.get<PlatformBusinessPage>('/platform/businesses', { params: query });
    return data;
  },

  async listPlans(): Promise<PlatformPlan[]> {
    const { data } = await http.get<PlatformPlan[]>('/platform/plans');
    return data;
  },
};
