import * as SecureStore from 'expo-secure-store';

import type { UserData } from '@/types/auth';

const KEYS = {
  ACCESS_TOKEN: 'alma_access_token',
  REFRESH_TOKEN: 'alma_refresh_token',
  USER_DATA: 'alma_user_data',
} as const;

export const sessionStore = {
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
  },
  async setAccessToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, token);
  },
  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
  },
  async setRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, token);
  },
  async getUserData(): Promise<UserData | null> {
    const raw = await SecureStore.getItemAsync(KEYS.USER_DATA);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as UserData;
    } catch {
      return null;
    }
  },
  async setUserData(user: UserData): Promise<void> {
    await SecureStore.setItemAsync(KEYS.USER_DATA, JSON.stringify(user));
  },
  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(KEYS.USER_DATA),
    ]);
  },
};
