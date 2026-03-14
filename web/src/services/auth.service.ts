import { apiClient, setToken, clearToken } from '@/lib/api-client';
import type { AuthTokens, User } from '@/types';

export const authService = {
  async register(data: { name: string; email: string; password: string }): Promise<AuthTokens> {
    const res = await apiClient.post<AuthTokens>('/auth/register', data);
    setToken(res.data.accessToken);
    return res.data;
  },

  async login(data: { email: string; password: string }): Promise<AuthTokens> {
    const res = await apiClient.post<AuthTokens>('/auth/login', data);
    setToken(res.data.accessToken);
    return res.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout').catch(() => {});
    clearToken();
  },

  async me(): Promise<User> {
    const res = await apiClient.get<User>('/auth/me');
    return res.data;
  },
};
