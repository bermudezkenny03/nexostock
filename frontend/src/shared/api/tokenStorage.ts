export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_KEY = 'nexostock.session.refresh';

/** The access token never leaves memory; only the refresh token survives a reload of this tab. */
let accessToken: string | null = null;

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return accessToken;
  },

  getRefreshToken(): string | null {
    return storage()?.getItem(REFRESH_KEY) ?? null;
  },

  setTokens(pair: TokenPair): void {
    accessToken = pair.accessToken;
    storage()?.setItem(REFRESH_KEY, pair.refreshToken);
  },

  clear(): void {
    accessToken = null;
    storage()?.removeItem(REFRESH_KEY);
  },
};
