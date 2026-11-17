import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Screen } from '@/components/ui/screen';
import { useCatalog } from '@/state/catalog';
export function CatalogGate({
  title,
  children,
  onBack
}) {
  const catalog = useCatalog();
  if (catalog.status === 'loading') {
    return <Screen tone="brand" title={title} onBack={onBack} safeBottom={false}>
        <LoadingState message="Carregando dados da conta…" />
      </Screen>;
  }
  if (catalog.status === 'error') {
    return <Screen tone="brand" title={title} onBack={onBack} safeBottom={false}>
        <ErrorState title="Não foi possível carregar" description={catalog.error ?? 'Tente novamente.'} actionLabel="Tentar de novo" onAction={catalog.reload} />
      </Screen>;
  }
  return children;
}
