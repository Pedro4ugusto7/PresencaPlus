import { Redirect, Stack } from 'expo-router';

import { LoadingState } from '@/components/ui/loading-state';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/state/auth-session';
import { LiveCatalogProvider } from '@/state/catalog';
import { toHref } from '@/navigation/area-paths';
import { palette } from '@/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function ProfessorLayout() {
  const { status, profile } = useAuth();

  if (status === 'loading') {
    return (
      <Screen tone="brand" title="Presença+">
        <LoadingState message="Carregando sessão…" />
      </Screen>
    );
  }

  if (status !== 'ready' || profile?.role !== 'professor') {
    return <Redirect href={profile?.role === 'aluno' ? toHref('/aluno') : toHref('/login')} />;
  }

  return (
    <LiveCatalogProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
        }}
      />
    </LiveCatalogProvider>
  );
}
