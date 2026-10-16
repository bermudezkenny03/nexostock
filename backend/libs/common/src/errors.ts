import { HttpException } from '@nestjs/common';

export const ErrorCode = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  BUSINESS_INACTIVE: 'BUSINESS_INACTIVE',
  BUSINESS_SUSPENDED: 'BUSINESS_SUSPENDED',
  PLAN_LIMIT_REACHED: 'PLAN_LIMIT_REACHED',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  IDEMPOTENCY_KEY_REUSED: 'IDEMPOTENCY_KEY_REUSED',
  IDEMPOTENCY_IN_PROGRESS: 'IDEMPOTENCY_IN_PROGRESS',
  UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
  UPSTREAM_TIMEOUT: 'UPSTREAM_TIMEOUT',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
} as const;

export class UpstreamError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

export function rethrowUpstream(error: unknown): never {
  if (error instanceof UpstreamError) {
    throw new HttpException(
      { message: error.message, code: error.code },
      error.statusCode,
    );
  }
  throw error;
}

export function isPrismaKnownError(
  exception: unknown,
): exception is { code: string; name: string } {
  if (typeof exception !== 'object' || exception === null) {
    return false;
  }
  const record = exception as { code?: unknown; name?: unknown };
  return (
    record.name === 'PrismaClientKnownRequestError' &&
    typeof record.code === 'string'
  );
}
