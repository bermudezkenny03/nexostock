/**
 * Fallback catalog when GET /auth/plans is unavailable.
 * Limits match migration `20261004000000_saas_plans`. FREE is 0; the others have no published price.
 * While this fallback is in use, registration does not send planCode.
 */
export interface PublicPlan {
  code: string;
  name: string;
  description: string | null;
  maxUsers: number | null;
  maxProducts: number | null;
  monthlyPrice: string | null;
}

export const PUBLIC_PLANS: readonly PublicPlan[] = [
  {
    code: 'FREE',
    name: 'Gratis',
    description: 'Para empezar: el dueño y un empleado.',
    maxUsers: 2,
    maxProducts: 50,
    monthlyPrice: '0',
  },
  {
    code: 'BASIC',
    name: 'Básico',
    description: 'Para negocios pequeños con un equipo de hasta 5 personas.',
    maxUsers: 5,
    maxProducts: 500,
    monthlyPrice: null,
  },
  {
    code: 'PRO',
    name: 'Pro',
    description: 'Sin límites de usuarios ni de productos.',
    maxUsers: null,
    maxProducts: null,
    monthlyPrice: null,
  },
];
