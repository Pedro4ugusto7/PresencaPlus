import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FrequencyBar } from '@/components/ui/frequency-bar';
import { InfoRow } from '@/components/ui/info-row';
import { LoadingState } from '@/components/ui/loading-state';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { pendingMessages } from '@/content/messages';
import { attendanceRate, describeStudentCheckIn, frequencyTone } from '@/domain';
import { CheckInBanner } from '@/features/student/check-in-banner';
import { CatalogGate } from '@/features/shared/catalog-gate';
import { MissingRecord } from '@/features/shared/missing-record';
import { useCatalog } from '@/state/catalog';
import { useRouteParam } from '@/navigation/params';
export function SubjectDetailScreen() {
  const router = useRouter();
  const catalog = useCatalog();
  const disciplinaId = useRouteParam('disciplinaId');
  const reload = catalog.reload;
  const live = catalog.mode === 'live';
  useFocusEffect(useCallback(() => {
    if (!live) return undefined;
    reload(true);
    return undefined;
  }, [live, reload]));
  if (!disciplinaId) {
    return <Screen tone="brand" title="Disciplina" onBack={() => router.back()}>
        <LoadingState />
      </Screen>;
  }
  const subject = catalog.getSubject(disciplinaId);
  if (!subject) {
    return <CatalogGate title="Disciplina" onBack={() => router.back()}>
        <MissingRecord title="Disciplina" />
      </CatalogGate>;
  }
  const percent = attendanceRate(subject.attended, subject.totalClasses);
  const checkIn = describeStudentCheckIn({
    discipline: subject.name,
    current: subject.currentCall ?? null,
    previous: subject.previousCall ?? null
  });
  const openForCheckIn = live && checkIn.actionsEnabled;
  return <CatalogGate title="Disciplina" onBack={() => router.back()}>
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
      {live ? <CheckInBanner view={checkIn} /> : null}
      {openForCheckIn || !live && subject.hasOpenCall ? <Button label="Registrar presença" icon="check" onPress={() => router.push(catalog.paths.register(subject.id))} /> : live && checkIn.kind !== 'none' ? <Button label="Ver presença" variant="secondary" onPress={() => router.push(catalog.paths.register(subject.id))} /> : <Notice message={catalog.mode === 'demo' ? pendingMessages.noOpenSubject : 'Não há chamada aberta para esta disciplina.'} />}
    </Screen>
    </CatalogGate>;
}
