import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FrequencyBar } from '@/components/ui/frequency-bar';
import { InfoRow } from '@/components/ui/info-row';
import { LoadingState } from '@/components/ui/loading-state';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { pendingMessages } from '@/content/messages';
import { previewSource } from '@/data';
import { attendanceRate, frequencyTone } from '@/domain';
import { MissingRecord } from '@/features/shared/missing-record';
import { useRouteParam } from '@/navigation/params';

export function SubjectDetailScreen() {
  const router = useRouter();
  const disciplinaId = useRouteParam('disciplinaId');

  if (!disciplinaId) {
    return (
      <Screen tone="brand" title="Disciplina" onBack={() => router.back()}>
        <LoadingState />
      </Screen>
    );
  }

  const subject = previewSource.getSubject(disciplinaId);
  if (!subject) return <MissingRecord title="Disciplina" />;

  const percent = attendanceRate(subject.attended, subject.totalClasses);

  return (
    <Screen tone="brand" title={subject.name} subtitle={subject.professor} onBack={() => router.back()}>
      <Card>
        <FrequencyBar percent={percent} tone={frequencyTone(percent)} />
        <InfoRow label="Curso" value={`${subject.period} · ${subject.program}`} />
        <InfoRow label="Horário" value={subject.schedule} />
        <InfoRow label="Sala" value={subject.room} />
        <InfoRow label="Presenças" value={`${subject.attended} de ${subject.totalClasses} aulas`} />
        <InfoRow label="Faltas" value={String(subject.absences)} />
        <InfoRow label="Próxima aula" value={subject.nextClassLabel} />
      </Card>
      {subject.hasOpenCall ? (
        <Button
          label="Registrar presença"
          icon="check"
          onPress={() =>
            router.push({
              pathname: '/demo/aluno/registrar/[disciplinaId]',
              params: { disciplinaId: subject.id },
            })
          }
        />
      ) : (
        <Notice message={pendingMessages.noOpenSubject} />
      )}
    </Screen>
  );
}
