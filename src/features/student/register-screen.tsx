import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/app-text';
import { LoadingState } from '@/components/ui/loading-state';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { canSubmitCheckIn, confirmedPresenceMessage, describeStudentCheckIn, formatSessionCode } from '@/domain';
import { confirmAttendance, parseAttendanceCredential } from '@/data/remote/attendance-ops';
import { CheckInBanner } from '@/features/student/check-in-banner';
import { QrScanner } from '@/features/student/qr-scanner';
import { CatalogGate } from '@/features/shared/catalog-gate';
import { MissingRecord } from '@/features/shared/missing-record';
import { useCatalog } from '@/state/catalog';
import { useRouteParam } from '@/navigation/params';

type Phase = 'idle' | 'busy';

export function RegisterScreen() {
  const router = useRouter();
  const catalog = useCatalog();
  const disciplinaId = useRouteParam('disciplinaId');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<'info' | 'warning'>('warning');
  const [scanning, setScanning] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [acknowledgedSessionId, setAcknowledgedSessionId] = useState<string | null>(null);
  const reload = catalog.reload;
  const live = catalog.mode === 'live';

  useFocusEffect(
    useCallback(() => {
      if (!live) return undefined;
      reload(true);
      return undefined;
    }, [live, reload]),
  );

  if (!disciplinaId) {
    return (
      <Screen tone="brand" title="Registro de presença" onBack={() => router.back()}>
        <LoadingState />
      </Screen>
    );
  }

  const subject = catalog.getSubject(disciplinaId);
  if (!subject) {
    return (
      <CatalogGate title="Registro de presença" onBack={() => router.back()}>
        <MissingRecord title="Registro de presença" />
      </CatalogGate>
    );
  }

  const currentSubject = subject;
  const serverView = describeStudentCheckIn({
    discipline: currentSubject.name,
    current: currentSubject.currentCall ?? null,
    previous: currentSubject.previousCall ?? null,
  });
  const acknowledged =
    acknowledgedSessionId != null && acknowledgedSessionId === currentSubject.currentCall?.sessionId && serverView.kind === 'pending';
  const view = acknowledged
    ? {
        ...serverView,
        kind: 'confirmed' as const,
        actionsEnabled: false,
        badge: 'Presença confirmada',
        badgeTone: 'present' as const,
        message: confirmedPresenceMessage(currentSubject.name, currentSubject.currentCall?.startsAt ?? new Date().toISOString()),
        dateLabel: serverView.dateLabel,
      }
    : serverView;
  const canSubmit = live ? canSubmitCheckIn(view.actionsEnabled, phase) : phase !== 'busy';

  async function submit(sessionId: string, digits: string) {
    if (!canSubmit) {
      setScanning(false);
      return;
    }
    setPhase('busy');
    setError(undefined);
    setNotice(null);
    const result = await confirmAttendance(sessionId, digits);
    setScanning(false);
    if (result.ok) {
      if (sessionId === currentSubject.currentCall?.sessionId) setAcknowledgedSessionId(sessionId);
      setPhase('idle');
      reload(true);
      return;
    }
    setNoticeTone('warning');
    setNotice(result.message);
    setPhase('idle');
    if (result.result === 'rede') reload();
  }

  function confirmManual() {
    if (!canSubmit) return;
    const digits = code.replace(/\D/g, '');
    if (digits.length !== 6) {
      setError('Informe o código de 6 dígitos.');
      setNotice(null);
      return;
    }
    setError(undefined);
    if (live) {
      if (!currentSubject.currentCall || currentSubject.currentCall.status !== 'aberta') {
        setNoticeTone('warning');
        setNotice('Não há chamada aberta para esta disciplina.');
        return;
      }
      void submit(currentSubject.currentCall.sessionId, digits);
      return;
    }
    if (subject?.sessionCode && digits === subject.sessionCode) {
      setNoticeTone('warning');
      setNotice('Código reconhecido nesta pré-visualização. O registro ainda não é enviado.');
      return;
    }
    setNoticeTone('warning');
    setNotice('Código diferente do exemplo desta aula. Nenhum registro foi enviado.');
  }

  function onScan(value: string) {
    if (!canSubmit) {
      setScanning(false);
      return;
    }
    const parsed = parseAttendanceCredential(value);
    if (!parsed) {
      setScanning(false);
      setNoticeTone('warning');
      setNotice('Esta leitura não é um QR Code de chamada do Presença+.');
      return;
    }
    void submit(parsed.sessionId, parsed.code);
  }

  return (
    <CatalogGate title="Registro de presença" onBack={() => router.back()}>
      <RegisterBody
        subjectName={subject.name}
        nextClassLabel={subject.nextClassLabel}
        room={subject.room}
        demoCode={catalog.mode === 'demo' ? subject.sessionCode : null}
        live={live}
        view={view}
        canSubmit={canSubmit}
        scanning={scanning && canSubmit}
        code={code}
        error={error}
        notice={notice}
        noticeTone={noticeTone}
        phase={phase}
        onCode={setCode}
        onScanPress={() => {
          if (!canSubmit) return;
          setScanning(true);
        }}
        onScan={onScan}
        onCloseScan={() => setScanning(false)}
        onConfirm={confirmManual}
        onBack={() => router.back()}
        onRefresh={() => reload()}
      />
    </CatalogGate>
  );
}

type RegisterBodyProps = {
  subjectName: string;
  nextClassLabel: string;
  room: string;
  demoCode: string | null;
  live: boolean;
  view: ReturnType<typeof describeStudentCheckIn>;
  canSubmit: boolean;
  scanning: boolean;
  code: string;
  error?: string;
  notice: string | null;
  noticeTone: 'info' | 'warning';
  phase: Phase;
  onCode: (value: string) => void;
  onScanPress: () => void;
  onScan: (value: string) => void;
  onCloseScan: () => void;
  onConfirm: () => void;
  onBack: () => void;
  onRefresh: () => void;
};

function RegisterBody(props: RegisterBodyProps) {
  return (
    <Screen tone="brand" title="Registro de presença" subtitle={props.subjectName} onBack={props.onBack} keyboard>
      <Card>
        <AppText size="label" tone="muted">
          {props.nextClassLabel} · {props.room}
        </AppText>
        {props.view.kind === 'pending' ? (
          <AppText size="body">Escaneie o QR Code do professor ou digite os 6 dígitos.</AppText>
        ) : null}
        {props.demoCode ? (
          <AppText size="caption" tone="muted">
            Exemplo desta pré-visualização: {formatSessionCode(props.demoCode)}.
          </AppText>
        ) : null}
      </Card>
      {props.live ? <CheckInBanner view={props.view} /> : null}
      {props.live && props.scanning ? <QrScanner onScan={props.onScan} onClose={props.onCloseScan} /> : null}
      {props.live && !props.scanning ? (
        <Button label="Escanear QR Code" variant="secondary" onPress={props.onScanPress} disabled={!props.canSubmit} />
      ) : null}
      <TextField
        label="Digitar código"
        value={props.code}
        onChangeText={props.onCode}
        placeholder="000 000"
        keyboardType="number-pad"
        autoComplete="off"
        textContentType="oneTimeCode"
        maxLength={7}
        editable={props.canSubmit}
        error={props.error}
      />
      <Button
        label={props.phase === 'busy' ? 'Confirmando…' : 'Confirmar presença'}
        onPress={props.onConfirm}
        disabled={!props.canSubmit}
        accessibilityHint={props.live ? 'Envia a confirmação da chamada aberta' : 'Não envia a presença nesta versão'}
      />
      {props.live && props.view.kind === 'expired' ? (
        <Button label="Atualizar" variant="secondary" onPress={props.onRefresh} />
      ) : null}
      {props.notice ? <Notice message={props.notice} tone={props.noticeTone} /> : null}
    </Screen>
  );
}
