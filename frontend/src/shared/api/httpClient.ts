import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../constants/config';
import { ApiErrorCode, toApiError, type ApiError } from './errors';
import { tokenStorage } from './tokenStorage';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Do not attach the Bearer token (public auth endpoints). */
    skipAuth?: boolean;
    /** Do not try to refresh the session when this request returns 401. */
    skipAuthRefresh?: boolean;
  }
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _authRetried?: boolean;
}

/** Implemented by the auth module; keeps `shared/` free of business modules. */
export interface AuthBridge {
  /** Rotates the token pair. Resolves `false` when the session cannot be renewed. */
  refresh(): Promise<boolean>;
  onSessionExpired(error: ApiError): void;
  onBusinessSuspended(error: ApiError): void;
}

let bridge: AuthBridge | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export function configureAuthBridge(next: AuthBridge | null): void {
  bridge = next;
  refreshInFlight = null;
}

/**
 * Single-flight refresh: refresh tokens are single use, so concurrent 401s
 * (or a 401 racing the startup restore) must share one rotation.
 */
export function refreshSession(): Promise<boolean> {
  if (!bridge) {
    return Promise.resolve(false);
  }
  if (!refreshInFlight) {
    const activeBridge = bridge;
    refreshInFlight = activeBridge
      .refresh()
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export function createHttpClient(baseURL: string = API_BASE_URL): AxiosInstance {
  const instance = axios.create({
    baseURL,
    timeout: 20_000,
    headers: { Accept: 'application/json' },
  });

  instance.interceptors.request.use((config) => {
    const token = tokenStorage.getAccessToken();
    if (token && !config.skipAuth) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (rawError: unknown) => {
      const error = toApiError(rawError);
      const config = (axios.isAxiosError(rawError) ? rawError.config : undefined) as RetriableConfig | undefined;

      if (error.status === 401 && config && !config.skipAuth && !config.skipAuthRefresh) {
        if (!config._authRetried) {
          config._authRetried = true;
          const renewed = await refreshSession();
          if (renewed) {
            config.headers.set('Authorization', `Bearer ${tokenStorage.getAccessToken() ?? ''}`);
            return instance.request(config);
          }
        }
        bridge?.onSessionExpired(error);
      } else if (
        error.status === 403 &&
        (error.code === ApiErrorCode.BUSINESS_SUSPENDED || error.code === ApiErrorCode.BUSINESS_INACTIVE) &&
        !config?.skipAuth
      ) {
        bridge?.onBusinessSuspended(error);
      }
      return Promise.reject(error);
    },
  );

  return instance;
}

export const http = createHttpClient();
