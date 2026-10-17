import type { AuthApiSchemas } from '@/shared/api';

export type BusinessProfile = AuthApiSchemas['schemas']['BusinessProfileEntity'];
export type Plan = AuthApiSchemas['schemas']['PlanEntity'];

export interface MyPlanRequest {
  id: string;
  requestedPlanCode: string;
  requestedPlanName: string;
  createdAt: string;
}

export interface PublicPlanOption {
  code: string;
  name: string;
  description: string | null;
  monthlyPrice: string | null;
}
