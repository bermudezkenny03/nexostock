import type { AuthApiSchemas } from '@/shared/api';

type Schemas = AuthApiSchemas['schemas'];

export type PlatformBusiness = Schemas['PlatformBusinessEntity'];
export type PlatformBusinessPage = Schemas['PlatformBusinessPageEntity'];
export type PlatformPlan = Schemas['PlanEntity'] & {
  /** Decimal string from the catalog. Absent until the auth service exposes it. */
  monthlyPrice?: string | null;
};

export interface PlatformPlanRequest {
  id: string;
  businessId: string;
  businessName: string;
  currentPlanCode: string;
  currentPlanName: string;
  requestedPlanCode: string;
  requestedPlanName: string;
  createdAt: string;
}

export interface UpdatePlatformPlan {
  name?: string;
  description?: string | null;
  maxUsers?: number | null;
  maxProducts?: number | null;
  monthlyPrice?: string | null;
}

export interface PlatformBusinessQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
  planCode?: string;
}
