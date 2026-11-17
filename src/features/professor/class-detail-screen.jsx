import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/app-text';
import { FrequencyBar } from '@/components/ui/frequency-bar';
import { InfoRow } from '@/components/ui/info-row';
import { Screen } from '@/components/ui/screen';
import { attendanceRate, frequencyTone } from '@/domain';
import { CatalogGate } from '@/features/shared/catalog-gate';
import { MissingRecord } from '@/features/shared/missing-record';
import { useCatalog } from '@/state/catalog';
import { useRouteParam } from '@/navigation/params';
import { LoadingState } from '@/components/ui/loading-state';
export function ClassDetailScreen() {
  const router = useRouter();
  const catalog = useCatalog();
  const turmaId = useRouteParam('turmaId');
  if (!turmaId) {
    return <Screen tone="brand" title="Turma" onBack={() => router.back()}>
        <LoadingState />
      </Screen>;
  }
  const details = catalog.getClass(turmaId);
  if (!details) {
    return <CatalogGate title="Turma" onBack={() => router.back()}>
        <MissingRecord title="Turma" />
      </CatalogGate>;
  }
  const percent = attendanceRate(details.presentRecords, details.expectedRecords);
  return <CatalogGate title="Turma" onBack={() => router.back()}>
    <Screen tone="brand" title={details.discipline} subtitle={[details.groupName, details.period, details.program].filter(Boolean).join(' · ')} onBack={() => router.back()}>
      <Card>
        <FrequencyBar percent={percent} tone={frequencyTone(percent)} />
        {details.groupName ? <InfoRow label="Turma acadêmica" value={details.groupName} /> : null}
        <InfoRow label="Horário" value={details.schedule} />
        <InfoRow label="Sala" value={details.room} />
        <InfoRow label="Alunos" value={String(details.enrolled)} />
        <InfoRow label="Próxima aula" value={details.nextClassLabel} />
        <InfoRow label="Registros de presença" value={`${details.presentRecords} de ${details.expectedRecords}`} />
      </Card>
      <Button label="Área de chamada" icon="call" onPress={() => router.push(catalog.paths.call(details.id))} />
      <Button label="Lista de presença" variant="secondary" onPress={() => router.push(catalog.paths.roster(details.id))} />
      {(details.heldSessions ?? []).length > 0 ? <Card>
          <AppText size="label">Chamadas desta turma</AppText>
          {details.heldSessions?.map(session => <InfoRow key={session.id} label={session.label} value={session.status === 'aberta' ? 'Aberta' : `${session.presentCount} presentes`} />)}
        </Card> : null}
      <AppText size="caption" tone="muted">
        {catalog.mode === 'demo' ? 'Os números acima vêm dos dados locais e não são atualizados por esta tela.' : 'A frequência usa somente as chamadas encerradas. Uma chamada aberta ainda não gera falta.'}
      </AppText>
    </Screen>
    </CatalogGate>;
}
