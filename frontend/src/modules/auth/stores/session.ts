import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { claimTabSession, refreshSession, tokenStorage } from '@/shared/api';
import { Permission, PLATFORM_BUSINESS_ID } from '@/shared/constants/permissions';
import type { Panel } from '@/shared/types/navigation';
import { authApi } from '../api/authApi';
import type { AuthUser, ChangePasswordRequest, LoginRequest, SessionStatus } from '../types';

export const useSessionStore = defineStore('session', () => {
  const user = ref<AuthUser | null>(null);
  const status = ref<SessionStatus>('idle');
  let restoring: Promise<void> | null = null;

  const permissions = computed<ReadonlySet<string>>(() => new Set(user.value?.permissions ?? []));
  const isAuthenticated = computed(() => status.value === 'authenticated' && user.value !== null);
  const isPlatform = computed(
    () => user.value?.businessId === PLATFORM_BUSINESS_ID && permissions.value.has(Permission.PLATFORM_MANAGE),
  );
  const panel = computed<Panel>(() => (isPlatform.value ? 'platform' : 'business'));
  const displayName = computed(() => {
    const current = user.value;
    if (!current) {
      return '';
    }
    const fullName = [current.firstName, current.lastName].filter(Boolean).join(' ');
    return fullName || current.email;
  });

  function can(codes: readonly string[] | string): boolean {
    const list = typeof codes === 'string' ? [codes] : codes;
    return list.length === 0 || list.some((code) => permissions.value.has(code));
  }

  function clear(): void {
    tokenStorage.clear();
    user.value = null;
    status.value = 'anonymous';
  }

  /** Resolves once the session state is known. Safe to call from every navigation. */
  function restore(): Promise<void> {
    if (status.value === 'authenticated' || status.value === 'anonymous') {
      return Promise.resolve();
    }
    restoring ??= (async () => {
      status.value = 'restoring';
      try {
        if ((await claimTabSession()) === 'duplicate') {
          tokenStorage.clear();
        }
        if (!tokenStorage.getRefreshToken()) {
          clear();
          return;
        }
        if (!(await refreshSession())) {
          clear();
          return;
        }
        user.value = await authApi.me();
        status.value = 'authenticated';
      } catch {
        clear();
      } finally {
        restoring = null;
      }
    })();
    return restoring;
  }

  async function login(credentials: LoginRequest): Promise<AuthUser> {
    const response = await authApi.login(credentials);
    tokenStorage.setTokens(response);
    user.value = response.user;
    status.value = 'authenticated';
    return response.user;
  }

  async function reloadUser(): Promise<void> {
    user.value = await authApi.me();
  }

  async function logout(): Promise<void> {
    const refreshToken = tokenStorage.getRefreshToken();
    clear();
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => undefined);
    }
  }

  async function logoutAll(): Promise<void> {
    try {
      await authApi.logoutAll();
    } finally {
      clear();
    }
  }

  /** The backend revokes every refresh token on password change, so the session ends here. */
  async function changePassword(body: ChangePasswordRequest): Promise<void> {
    await authApi.changePassword(body);
    clear();
  }

  return {
    user,
    status,
    permissions,
    isAuthenticated,
    isPlatform,
    panel,
    displayName,
    can,
    clear,
    restore,
    login,
    reloadUser,
    logout,
    logoutAll,
    changePassword,
  };
});

export type SessionStore = ReturnType<typeof useSessionStore>;
