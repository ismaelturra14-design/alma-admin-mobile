import { create, type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { ENV } from '@/config/env';
import {
    notifyApiForbidden,
    notifySessionExpired,
    notifyTokensRefreshed,
} from '@/features/auth/services/authSessionEvents';
import type { RefreshTokenResponse } from '@/features/auth/types/auth';
import { sessionStore } from '@/store/sessionStore';

const api = create({
  baseURL: ENV.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

const refreshClient = create({
  baseURL: ENV.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

let isRefreshing = false;
let failedQueue: {
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
}[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
      return;
    }

    if (token) {
      promise.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await sessionStore.getAccessToken();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 403) {
      notifyApiForbidden();
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await sessionStore.getRefreshToken();

        if (!refreshToken) {
          throw new Error('No hay refresh token disponible');
        }

        const refreshResponse = await refreshClient.post('/auth/refresh-token', {
          refresh_token: refreshToken,
        });

        const payload = refreshResponse.data as RefreshTokenResponse;

        if (
          payload?.access_token &&
          payload?.refresh_token &&
          (!payload.status || payload.status === 'success')
        ) {
          await Promise.all([
            sessionStore.setAccessToken(payload.access_token),
            sessionStore.setRefreshToken(payload.refresh_token),
          ]);
          notifyTokensRefreshed({
            access_token: payload.access_token,
            refresh_token: payload.refresh_token,
            access_expires_in: payload.access_expires_in,
          });

          processQueue(null, payload.access_token);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${payload.access_token}`;
          }

          return api(originalRequest);
        }

        throw new Error('Refresh token inválido');
      } catch (refreshError) {
        processQueue(refreshError, null);
        await sessionStore.clear().catch(() => undefined);
        notifySessionExpired();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
