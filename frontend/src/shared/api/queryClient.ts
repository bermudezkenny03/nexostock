import { QueryClient } from '@tanstack/vue-query';
import { toApiError } from './errors';

const MAX_RETRIES = 2;

/** Retry only transient failures; 4xx answers are deterministic. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) {
    return false;
  }
  const apiError = toApiError(error);
  return apiError.isNetworkError || apiError.status >= 500;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
