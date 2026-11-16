import { Redirect } from 'expo-router';

import { LoadingState } from '@/components/ui/loading-state';
import { Screen } from '@/components/ui/screen';
import { WelcomeScreen } from '@/features/welcome/welcome-screen';
import { toHref } from '@/navigation/area-paths';
import { useAuth } from '@/state/auth-session';

export default function Index() {
  const { status, profile } = useAuth();

  if (status === 'loading') {
    return (
      <Screen>
        <LoadingState message="Carregando sessão…" />
      </Screen>
    );
  }

  if (status === 'needsProfile' || status === 'profileError') return <Redirect href={toHref('/login')} />;
  if (status === 'ready' && profile?.role === 'professor') return <Redirect href={toHref('/professor')} />;
  if (status === 'ready' && profile?.role === 'aluno') return <Redirect href={toHref('/aluno')} />;
  return <WelcomeScreen />;
}
