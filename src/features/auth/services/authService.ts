import { authApi } from '@/features/auth/api/authApi';
import { sessionStore } from '@/store/sessionStore';
import type { LoginResponse, UserData } from '@/features/auth/types/auth';

export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const result = await authApi.login(username, password);

    await sessionStore.setAccessToken(result.tokens.access_token);
    await sessionStore.setRefreshToken(result.tokens.refresh_token);
    await sessionStore.setUserData(result.data);

    return result;
  },

  async logout(): Promise<void> {
    await sessionStore.clear();
  },

  async getStoredUser(): Promise<UserData | null> {
    return sessionStore.getUserData();
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await sessionStore.getAccessToken();
    return Boolean(token);
  },
};
