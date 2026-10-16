import { ErrorCode, UpstreamError } from './errors';
import { internalApiKey } from './env';

export interface InternalRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  accessToken?: string;
  idempotencyKey?: string;
  timeoutMs?: number;
}

function readCode(body: unknown): { message: string; code: string } {
  if (typeof body !== 'object' || body === null) {
    return { message: 'El servicio no está disponible', code: ErrorCode.UPSTREAM_UNAVAILABLE };
  }
  const record = body as Record<string, unknown>;
  const message = typeof record.message === 'string' ? record.message : 'Solicitud rechazada';
  const code = typeof record.code === 'string' ? record.code : 'UPSTREAM_ERROR';
  return { message, code };
}

export async function internalRequest<T>(
  baseUrl: string,
  options: InternalRequestOptions,
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 5000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Internal-Key': internalApiKey(),
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }
  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

  try {
    const response = await fetch(`${baseUrl}${options.path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    const text = await response.text();
    const parsed: unknown = text ? JSON.parse(text) : undefined;
    if (!response.ok) {
      const { message, code } = readCode(parsed);
      throw new UpstreamError(response.status, code, message, parsed);
    }
    return parsed as T;
  } catch (error) {
    if (error instanceof UpstreamError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new UpstreamError(
        504,
        ErrorCode.UPSTREAM_TIMEOUT,
        'El servicio no respondió a tiempo',
      );
    }
    throw new UpstreamError(
      503,
      ErrorCode.UPSTREAM_UNAVAILABLE,
      'El servicio no está disponible. Intenta de nuevo.',
    );
  } finally {
    clearTimeout(timer);
  }
}
