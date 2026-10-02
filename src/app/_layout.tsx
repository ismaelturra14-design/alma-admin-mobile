import { Redirect, Stack, usePathname } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'ios') {
      void ScreenCapture.enableAppSwitcherProtectionAsync(0.85).catch(() => undefined);
    } else if (Platform.OS === 'android') {
      void ScreenCapture.preventScreenCaptureAsync('alma-admin-privacy').catch(() => undefined);
    }

    return () => {
      if (Platform.OS === 'ios') {
        void ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => undefined);
      } else if (Platform.OS === 'android') {
        void ScreenCapture.allowScreenCaptureAsync('alma-admin-privacy').catch(() => undefined);
      }
    };
  }, []);

  return (
    <AuthProvider>
      <AuthenticatedStack />
    </AuthProvider>
  );
}

function AuthenticatedStack() {
  const { isAuthenticated, isHydrating } = useAuth();
  const pathname = usePathname();

  if (isHydrating) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated && pathname !== '/login') {
    return <Redirect href="/login" />;
  }

  if (isAuthenticated && pathname === '/login') {
    return <Redirect href="/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
