import { UnauthorizedException } from '@nestjs/common';
import type { JwtPayload } from './jwt-payload.interface';

export function isJwtPayload(payload: unknown): payload is JwtPayload {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const record = payload as Record<string, unknown>;
  const { sub, email, businessId, roles, permissions } = record;

  return (
    typeof sub === 'string' &&
    typeof email === 'string' &&
    typeof businessId === 'string' &&
    Array.isArray(roles) &&
    roles.every((item): item is string => typeof item === 'string') &&
    Array.isArray(permissions) &&
    permissions.every((item): item is string => typeof item === 'string')
  );
}

export function parseJwtPayload(payload: unknown): JwtPayload {
  if (!isJwtPayload(payload)) {
    throw new UnauthorizedException();
  }

  return payload;
}
