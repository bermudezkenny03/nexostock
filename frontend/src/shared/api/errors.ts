import { isAxiosError } from 'axios';
import type { ApiErrorBody } from './types';

export const ApiErrorCode = {
  NETWORK: 'NETWORK_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  USER_INACTIVE: 'USER_INACTIVE',
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

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly details: string[];
  readonly requestId: string | undefined;

  constructor(params: { status: number; message: string; code?: string; details?: string[]; requestId?: string }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.details = params.details ?? [];
    this.requestId = params.requestId;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null && 'statusCode' in value && 'message' in value;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (isAxiosError(error)) {
    const response = error.response;
    if (!response) {
      return new ApiError({ status: 0, code: ApiErrorCode.NETWORK, message: 'No se pudo conectar con el servidor' });
    }
    const requestId = (response.headers?.['x-request-id'] as string | undefined) ?? undefined;
    const body: unknown = response.data;
    if (isErrorBody(body)) {
      const details = Array.isArray(body.message) ? body.message : [];
      const message = Array.isArray(body.message) ? (body.message[0] ?? 'Solicitud inválida') : body.message;
      return new ApiError({ status: response.status, code: body.code, message, details, requestId });
    }
    return new ApiError({ status: response.status, message: error.message, requestId });
  }
  return new ApiError({
    status: -1,
    code: ApiErrorCode.UNKNOWN,
    message: error instanceof Error ? error.message : 'Error inesperado',
  });
}

const CODE_MESSAGES: Record<string, string> = {
  [ApiErrorCode.NETWORK]: 'No se pudo conectar con el servidor. Revisa tu conexión.',
  [ApiErrorCode.UNAUTHENTICATED]: 'Tu sesión expiró. Inicia sesión nuevamente.',
  [ApiErrorCode.USER_INACTIVE]: 'Tu cuenta está desactivada.',
  [ApiErrorCode.BUSINESS_INACTIVE]: 'El negocio está suspendido.',
  [ApiErrorCode.BUSINESS_SUSPENDED]: 'El negocio está suspendido. Contacta al administrador de la plataforma.',
  [ApiErrorCode.UPSTREAM_UNAVAILABLE]: 'El servicio no está disponible en este momento. Intenta más tarde.',
  [ApiErrorCode.UPSTREAM_TIMEOUT]: 'El servicio tardó demasiado en responder. Intenta nuevamente.',
  [ApiErrorCode.IDEMPOTENCY_IN_PROGRESS]: 'La operación ya se está procesando.',
};

const STATUS_MESSAGES: Record<number, string> = {
  403: 'No tienes permiso para realizar esta acción.',
  404: 'El recurso solicitado no existe.',
  429: 'Demasiados intentos. Espera un momento antes de reintentar.',
  500: 'Ocurrió un error en el servidor.',
  502: 'El servicio no está disponible en este momento.',
  503: 'El servicio no está disponible en este momento.',
};

/**
 * Human readable message. Business-rule errors (plan limit, stock, conflicts,
 * validation) keep the server message because it carries the specific reason.
 */
export function describeApiError(error: unknown): string {
  const apiError = toApiError(error);
  if (apiError.code && CODE_MESSAGES[apiError.code]) {
    return CODE_MESSAGES[apiError.code]!;
  }
  if (apiError.status === 400 || apiError.status === 409 || apiError.code) {
    return apiError.message;
  }
  return STATUS_MESSAGES[apiError.status] ?? apiError.message;
}
