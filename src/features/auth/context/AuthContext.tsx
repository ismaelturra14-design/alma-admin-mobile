import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { ROLE_GROUPS } from '@/constants/roles';
import { authService } from '@/features/auth/services/authService';
import {
    subscribeToSessionExpired,
    subscribeToTokensRefreshed,
} from '@/features/auth/services/authSessionEvents';
import type { AuthTokens, UserData } from '@/features/auth/types/auth';
import { sessionStore } from '@/store/sessionStore';

type AuthContextType = {
  user: UserData | null;
  tokens: AuthTokens | null;
  user_group_id: number | null;
  user_group_name: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  isHydrating: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permissionCode: string) => boolean;
  hasAnyPermission: (permissionCodes: string[]) => boolean;
  hasAllPermissions: (permissionCodes: string[]) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const [storedUser, accessToken, refreshToken] = await Promise.all([
          sessionStore.getUserData(),
          sessionStore.getAccessToken(),
          sessionStore.getRefreshToken(),
        ]);

        if (!isMounted) {
          return;
        }

        if (storedUser && accessToken && refreshToken) {
          setUser(storedUser);
          setTokens({ access_token: accessToken, refresh_token: refreshToken });
          setIsAuthenticated(true);
        } else {
          await sessionStore.clear();
        }
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(
    () =>
      subscribeToSessionExpired(() => {
        setUser(null);
        setTokens(null);
        setIsAuthenticated(false);
      }),
    [],
  );

  useEffect(
    () => subscribeToTokensRefreshed(setTokens),
    [],
  );

  const login = useCallback(async (username: string, password: string) => {
    setUser(null);
    setTokens(null);
    setIsAuthenticated(false);
    await sessionStore.clear();

    const response = await authService.login(username, password);
    setUser(response.data);
    setTokens(response.tokens);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setTokens(null);
    setIsAuthenticated(false);
    await authService.logout();
  }, []);

  const hasPermission = useCallback(
    (permissionCode: string): boolean => {
      if (!user) {
        return false;
      }

      const groupId = Number(user.user_group_id ?? 0);
      const superAdminGroups = ROLE_GROUPS.SUPER_ADMIN as unknown as number[];

      if (superAdminGroups.includes(groupId)) {
        return true;
      }

      return (user.permissions ?? []).includes(permissionCode);
    },
    [user]
  );

  const hasAnyPermission = useCallback(
    (permissionCodes: string[]) => permissionCodes.some((code) => hasPermission(code)),
    [hasPermission]
  );

  const hasAllPermissions = useCallback(
    (permissionCodes: string[]) => permissionCodes.every((code) => hasPermission(code)),
    [hasPermission]
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      tokens,
      user_group_id: user?.user_group_id ?? null,
      user_group_name: user?.user_group_name ?? null,
      permissions: user?.permissions ?? [],
      isAuthenticated,
      isHydrating,
      loading: isHydrating,
      login,
      logout,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
    }),
    [user, tokens, isAuthenticated, isHydrating, login, logout, hasPermission, hasAnyPermission, hasAllPermissions]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
