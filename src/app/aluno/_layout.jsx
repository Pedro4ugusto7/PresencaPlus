import { Redirect } from 'expo-router';
import { LoadingState } from '@/components/ui/loading-state';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/state/auth-session';
import { toHref } from '@/navigation/area-paths';
export const unstable_settings = {
  anchor: '(tabs)'
};
export default function StudentLayout() {
  const {
    status,
    profile
  } = useAuth();
  if (status === 'loading') {
    return <Screen tone="brand" title="Presença+">
        <LoadingState message="Carregando sessão…" />
      </Screen>;
  }
  return <Redirect href={profile?.role === 'professor' ? toHref('/professor') : toHref('/login')} />;
}
