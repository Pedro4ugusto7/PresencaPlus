import { useRouter } from 'expo-router';
import { ErrorState } from '@/components/ui/error-state';
import { Screen } from '@/components/ui/screen';
export function MissingRecord({
  title
}) {
  const router = useRouter();
  return <Screen tone="brand" title={title} onBack={() => router.back()}>
      <ErrorState title="Registro não encontrado" description="Este identificador não faz parte dos dados disponíveis nesta área." actionLabel="Voltar" onAction={() => router.back()} />
    </Screen>;
}
