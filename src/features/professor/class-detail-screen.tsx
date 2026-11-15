import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/app-text';
import { FrequencyBar } from '@/components/ui/frequency-bar';
import { InfoRow } from '@/components/ui/info-row';
import { Screen } from '@/components/ui/screen';
import { previewSource } from '@/data';
import { attendanceRate, frequencyTone } from '@/domain';
import { MissingRecord } from '@/features/shared/missing-record';
import { useRouteParam } from '@/navigation/params';
import { LoadingState } from '@/components/ui/loading-state';

export function ClassDetailScreen() {
  const router = useRouter();
  const turmaId = useRouteParam('turmaId');

  if (!turmaId) {
    return (
      <Screen tone="brand" title="Turma" onBack={() => router.back()}>
        <LoadingState />
      </Screen>
    );
  }

  const details = previewSource.getClass(turmaId);
  if (!details) return <MissingRecord title="Turma" />;

  const percent = attendanceRate(details.presentRecords, details.expectedRecords);

  return (
    <Screen tone="brand" title={details.discipline} subtitle={`${details.period} · ${details.program}`} onBack={() => router.back()}>
      <Card>
        <FrequencyBar percent={percent} tone={frequencyTone(percent)} />
        <InfoRow label="Horário" value={details.schedule} />
        <InfoRow label="Sala" value={details.room} />
        <InfoRow label="Alunos" value={String(details.enrolled)} />
        <InfoRow label="Próxima aula" value={details.nextClassLabel} />
        <InfoRow
          label="Registros de presença"
          value={`${details.presentRecords} de ${details.expectedRecords}`}
        />
      </Card>
      <Button
        label="Área de chamada"
        icon="call"
        onPress={() => router.push({ pathname: '/demo/professor/chamada/[turmaId]', params: { turmaId: details.id } })}
      />
      <Button
        label="Lista de presença"
        variant="secondary"
        onPress={() => router.push({ pathname: '/demo/professor/lista/[turmaId]', params: { turmaId: details.id } })}
      />
      <AppText size="caption" tone="muted">
        Os números acima vêm dos dados locais e não são atualizados por esta tela.
      </AppText>
    </Screen>
  );
}
