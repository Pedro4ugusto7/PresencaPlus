import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/state/auth-session';
import { palette } from '@/theme';
import { toHref } from '@/navigation/area-paths';

import '@/global.css';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(palette.background).catch(() => undefined);
  }, []);

  return (
    <AuthProvider>
      <SplashGate />
      <RootNavigator />
    </AuthProvider>
  );
}

function SplashGate() {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'loading') {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [status]);

  return null;
}

function RootNavigator() {
  const { status, profile } = useAuth();
  if (status === 'loading') return null;

  const professor = status === 'ready' && profile?.role === 'professor';
  const student = status === 'ready' && profile?.role === 'aluno';

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.background },
      }}>
      <Stack.Protected guard={professor} redirectTo={student ? toHref('/aluno') : toHref('/login')}>
        <Stack.Screen name="professor" />
      </Stack.Protected>
      <Stack.Protected guard={student} redirectTo={professor ? toHref('/professor') : toHref('/login')}>
        <Stack.Screen name="aluno" />
      </Stack.Protected>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="recuperar-senha" />
      <Stack.Screen name="redefinir-senha" />
      <Stack.Screen name="demo" />
    </Stack>
  );
}
