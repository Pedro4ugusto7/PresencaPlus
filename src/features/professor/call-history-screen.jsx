import { useRouter } from 'expo-router';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/app-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { LoadingState } from '@/components/ui/loading-state';
import { CatalogGate } from '@/features/shared/catalog-gate';
import { MissingRecord } from '@/features/shared/missing-record';
import { useCatalog } from '@/state/catalog';
import { useRouteParam } from '@/navigation/params';

export function CallHistoryScreen() {
  const router = useRouter();
  const catalog = useCatalog();
  const turmaId = useRouteParam('turmaId');
  if (!turmaId) {
    return <Screen tone="brand" title="Histórico de chamadas" onBack={() => router.back()} safeBottom={false}>
        <LoadingState />
      </Screen>;
  }
  const details = catalog.getClass(turmaId);
  if (!details) {
    return <CatalogGate title="Histórico de chamadas" onBack={() => router.back()}>
        <MissingRecord title="Histórico de chamadas" />
      </CatalogGate>;
  }
  const sessions = details.sessionHistory ?? [];
  return <CatalogGate title="Histórico de chamadas" onBack={() => router.back()}>
      <Screen tone="brand" title="Histórico de chamadas" subtitle={[details.groupName, details.discipline].filter(Boolean).join(' · ')} onBack={() => router.back()} safeBottom={false}>
        {catalog.mode === 'demo' ? <Notice tone="demo" message="Esta pré-visualização não grava listas de presença." /> : null}
        {sessions.length === 0 ? <EmptyState icon="history" title="Nenhuma chamada ainda" description="As listas aparecem aqui depois da primeira chamada, sem abrir uma nova." /> : sessions.map(session => <Card key={session.id} accessibilityLabel={`Chamada de ${session.dateLabel}`} onPress={() => router.push(catalog.paths.callSession(details.id, session.id))}>
            <AppText size="heading">{session.dateLabel}</AppText>
            <AppText size="label" tone="muted">{session.timeLabel}</AppText>
            <Badge label={session.current ? 'Chamada atual' : session.status === 'aberta' ? 'Aberta' : 'Lista anterior'} tone={session.current ? 'accent' : 'neutral'} />
            <AppText size="caption" tone="muted">
              {`${session.counts.presente} presenças · ${session.counts.falta} faltas · ${session.counts.justificada} justificadas · ${session.counts.unrecorded} sem registro`}
            </AppText>
          </Card>)}
      </Screen>
    </CatalogGate>;
}
