import { useRouter } from 'expo-router';

import { ErrorState } from '@/components/ui/error-state';
import { Screen } from '@/components/ui/screen';

type MissingRecordProps = {
  title: string;
};

export function MissingRecord({ title }: MissingRecordProps) {
  const router = useRouter();
  return (
    <Screen tone="brand" title={title} onBack={() => router.back()}>
      <ErrorState
        title="Registro não encontrado"
        description="Este identificador não existe nos dados de demonstração."
        actionLabel="Voltar"
        onAction={() => router.back()}
      />
    </Screen>
  );
}
