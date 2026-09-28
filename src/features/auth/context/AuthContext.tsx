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
import { sessionStore } from '@/store/sessionStore';
import type { UserData } from '@/features/auth/types/auth';

type AuthContextType = {
  user: UserData | null;
  isAuthenticated: boolean;
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const [storedUser, token] = await Promise.all([
          sessionStore.getUserData(),
          sessionStore.getAccessToken(),
        ]);

        if (!isMounted) {
          return;
        }

        if (storedUser && token) {
          setUser(storedUser);
          setIsAuthenticated(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await authService.login(username, password);
    setUser(response.data);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
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
      isAuthenticated,
      loading,
      login,
      logout,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
    }),
    [user, isAuthenticated, loading, login, logout, hasPermission, hasAnyPermission, hasAllPermissions]
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
