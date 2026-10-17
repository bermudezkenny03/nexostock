import { http } from '@/shared/api';
import type { PublicPlan } from '../constants/plans';
import type { AuthUser, ChangePasswordRequest, LoginRequest, LoginResponse, RefreshResponse, RegisterRequest } from '../types';

export const authApi = {
  async login(body: LoginRequest): Promise<LoginResponse> {
    const { data } = await http.post<LoginResponse>('/auth/login', body, { skipAuth: true });
    return data;
  },

  async listPlans(): Promise<PublicPlan[]> {
    const { data } = await http.get<PublicPlan[]>('/auth/plans', { skipAuth: true });
    return data;
  },

  async register(body: RegisterRequest): Promise<LoginResponse> {
    const { data } = await http.post<LoginResponse>('/auth/register', body, { skipAuth: true });
    return data;
  },

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const { data } = await http.post<RefreshResponse>('/auth/refresh', { refreshToken }, { skipAuth: true });
    return data;
  },

  async logout(refreshToken: string): Promise<void> {
    await http.post('/auth/logout', { refreshToken }, { skipAuth: true });
  },

  async logoutAll(): Promise<void> {
    await http.post('/auth/logout-all');
  },

  async me(): Promise<AuthUser> {
    const { data } = await http.get<AuthUser>('/auth/me');
    return data;
  },

  async changePassword(body: ChangePasswordRequest): Promise<void> {
    await http.post('/auth/change-password', body);
  },
};
