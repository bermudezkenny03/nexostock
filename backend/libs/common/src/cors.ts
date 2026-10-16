import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const DEFAULT_DEV_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
] as const;

export function resolveCorsOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGINS?.trim();
  if (fromEnv) {
    const origins = fromEnv
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    if (origins.length === 0) {
      throw new Error('CORS_ORIGINS is set but contains no valid origins.');
    }
    return origins;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CORS_ORIGINS must be set in production (comma-separated exact origins).',
    );
  }

  return [...DEFAULT_DEV_CORS_ORIGINS];
}

export function buildCorsOptions(): CorsOptions {
  const allowedOrigins = new Set(resolveCorsOrigins());
  return {
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) {
        callback(null, false);
        return;
      }
      callback(null, allowedOrigins.has(requestOrigin));
    },
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Idempotency-Key',
      'X-Request-Id',
    ],
    exposedHeaders: ['X-Request-Id'],
  };
}
