import { randomUUID } from 'node:crypto';
import type { IncomingHttpHeaders, OutgoingHttpHeaders } from 'node:http';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
]);

const CLIENT_SPOOFED = new Set([
  'x-internal-key',
  'x-business-id',
  'x-user-id',
]);

const REQUEST_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resolveRequestId(header: string | string[] | undefined): string {
  const value = Array.isArray(header) ? header[0] : header;
  if (value && REQUEST_ID.test(value)) {
    return value;
  }
  return randomUUID();
}

export function forwardedHeaders(
  incoming: IncomingHttpHeaders,
  requestId: string,
  clientIp: string,
): OutgoingHttpHeaders {
  const headers: OutgoingHttpHeaders = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined) {
      continue;
    }
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || CLIENT_SPOOFED.has(lower) || lower.startsWith('x-forwarded-')) {
      continue;
    }
    headers[key] = value;
  }
  headers['x-request-id'] = requestId;
  headers['x-forwarded-for'] = clientIp;
  return headers;
}
