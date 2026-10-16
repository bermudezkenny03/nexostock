import type { AuthApiSchemas } from '@/shared/api';

type Schemas = AuthApiSchemas['schemas'];

export type PlatformBusiness = Schemas['PlatformBusinessEntity'];
export type PlatformBusinessPage = Schemas['PlatformBusinessPageEntity'];
export type PlatformPlan = Schemas['PlanEntity'];

export interface PlatformBusinessQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
  planCode?: string;
}
