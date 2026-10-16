export function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Matches the backend Idempotency-Key pattern `^[A-Za-z0-9:_-]{8,80}$`. */
export function idempotencyKey(prefix: string): string {
  return `${prefix}:${randomId()}`;
}
