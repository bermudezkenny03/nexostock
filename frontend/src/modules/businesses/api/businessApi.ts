import { http } from '@/shared/api';
import type { BusinessProfile } from '../types';

export const businessApi = {
  /** Tenant is derived from the JWT; the client never sends a businessId. */
  async getMine(): Promise<BusinessProfile> {
    const { data } = await http.get<BusinessProfile>('/business/me');
    return data;
  },
};
