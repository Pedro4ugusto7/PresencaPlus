import { useRouter } from 'expo-router';
import { ErrorState } from '@/components/ui/error-state';
import { Screen } from '@/components/ui/screen';
export default function NotFound() {
  const router = useRouter();
  return <Screen tone="plain">
      <ErrorState title="Tela não encontrada" description="Esta rota não faz parte do Presença+." actionLabel="Ir para o início" onAction={() => router.replace('/')} />
    </Screen>;
}
