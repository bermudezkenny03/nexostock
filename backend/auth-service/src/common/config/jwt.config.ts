export const JWT_ISSUER_DEFAULT = 'nexostock-auth';
export const JWT_AUDIENCE_DEFAULT = 'nexostock-api';

const BLOCKED_PRODUCTION_SECRETS = new Set([
  'change-me-in-production',
  'dev-jwt-secret-change-in-production',
  'local-dev-jwt-secret-not-for-production',
]);

export function jwtIssuer(): string {
  return process.env.JWT_ISSUER?.trim() || JWT_ISSUER_DEFAULT;
}

export function jwtAudience(): string {
  return process.env.JWT_AUDIENCE?.trim() || JWT_AUDIENCE_DEFAULT;
}

export function jwtSecret(): string {
  return process.env.JWT_SECRET?.trim() || 'dev-jwt-secret-change-in-production';
}

export function assertProductionJwtSecret(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || BLOCKED_PRODUCTION_SECRETS.has(secret)) {
    throw new Error(
      'JWT_SECRET must be set to a unique value when NODE_ENV=production',
    );
  }
}
