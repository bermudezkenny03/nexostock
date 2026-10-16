export const JWT_ISSUER_DEFAULT = 'nexostock-auth';
export const JWT_AUDIENCE_DEFAULT = 'nexostock-api';

const BLOCKED_SECRETS = new Set([
  'change-me-in-production',
  'dev-jwt-secret-change-in-production',
  'local-dev-jwt-secret-not-for-production',
  'local-dev-internal-key',
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

export function internalApiKey(): string {
  return process.env.INTERNAL_API_KEY?.trim() || '';
}

export function assertProductionSecrets(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || BLOCKED_SECRETS.has(secret)) {
    throw new Error(
      'JWT_SECRET must be set to a unique value when NODE_ENV=production',
    );
  }

  const internalKey = process.env.INTERNAL_API_KEY?.trim();
  if (!internalKey || BLOCKED_SECRETS.has(internalKey) || internalKey.length < 16) {
    throw new Error(
      'INTERNAL_API_KEY must be set to a unique value when NODE_ENV=production',
    );
  }
}

export function serviceUrl(name: string, fallback: string): string {
  const raw = process.env[name]?.trim() || fallback;
  return raw.replace(/\/$/, '');
}
