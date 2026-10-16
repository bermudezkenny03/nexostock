import { toApiError, tokenStorage, type ApiError, type AuthBridge } from '@/shared/api';
import { authApi } from './api/authApi';

export interface SessionEndHandlers {
  onSessionExpired(error: ApiError): void;
  onBusinessSuspended(error: ApiError): void;
}

export function createAuthBridge(handlers: SessionEndHandlers): AuthBridge {
  return {
    async refresh() {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        return false;
      }
      try {
        tokenStorage.setTokens(await authApi.refresh(refreshToken));
        return true;
      } catch (error) {
        // A rejected token is already revoked server-side; keep it only on network
        // failures, where the request most likely never reached the backend.
        if (!toApiError(error).isNetworkError) {
          tokenStorage.clear();
        }
        return false;
      }
    },
    onSessionExpired: handlers.onSessionExpired,
    onBusinessSuspended: handlers.onBusinessSuspended,
  };
}
