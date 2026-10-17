/** Drops empty values so axios does not send `foo=&bar=null`. */
export function compactParams<T extends object>(query: T): T {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== '' && value !== null),
  ) as T;
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
