import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/app-text';
import { LoadingState } from '@/components/ui/loading-state';
import { Screen } from '@/components/ui/screen';
import { describeStudentCheckIn } from '@/domain';
import { CheckInBanner } from '@/features/student/check-in-banner';
import { CatalogGate } from '@/features/shared/catalog-gate';
import { MissingRecord } from '@/features/shared/missing-record';
import { useCatalog } from '@/state/catalog';
import { useRouteParam } from '@/navigation/params';
export function RegisterScreen() {
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
    return <Screen tone="brand" title="Registro de presença" onBack={() => router.back()}>
        <LoadingState />
      </Screen>;
  }
  const subject = catalog.getSubject(disciplinaId);
  if (!subject) {
    return <CatalogGate title="Registro de presença" onBack={() => router.back()}>
        <MissingRecord title="Registro de presença" />
      </CatalogGate>;
  }
  const currentSubject = subject;
  const serverView = describeStudentCheckIn({
    discipline: currentSubject.name,
    current: currentSubject.currentCall ?? null,
    previous: currentSubject.previousCall ?? null
  });
  return <CatalogGate title="Registro de presença" onBack={() => router.back()}>
      <RegisterBody subjectName={subject.name} nextClassLabel={subject.nextClassLabel} room={subject.room} live={live} view={serverView} onBack={() => router.back()} onRefresh={() => reload()} />
    </CatalogGate>;
}
function RegisterBody(props) {
  return <Screen tone="brand" title="Registro de presença" subtitle={props.subjectName} onBack={props.onBack} keyboard>
      <Card>
        <AppText size="label" tone="muted">
          {props.nextClassLabel} · {props.room}
        </AppText>
        {props.view.kind === 'pending' ? <AppText size="body">A presença é confirmada na página aberta pelo QR Code do professor, com a matrícula.</AppText> : null}
      </Card>
      {props.live ? <CheckInBanner view={props.view} /> : null}
      {props.live && props.view.kind === 'expired' ? <Button label="Atualizar" variant="secondary" onPress={props.onRefresh} /> : null}
    </Screen>;
}
