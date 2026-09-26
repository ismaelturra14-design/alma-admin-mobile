import api from '@/api/axiosClient';
import type { LoginResponse, RefreshTokenResponse } from '@/types/auth';

export const authApi = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login/web', {
      username,
      password,
    });

    return response.data;
  },

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await api.post<RefreshTokenResponse>('/auth/refresh-token', {
      refresh_token: refreshToken,
    });

    return response.data;
  },
};
