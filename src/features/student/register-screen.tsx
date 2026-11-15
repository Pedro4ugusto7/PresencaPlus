import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/app-text';
import { LoadingState } from '@/components/ui/loading-state';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { previewSource } from '@/data';
import { formatSessionCode } from '@/domain';
import { MissingRecord } from '@/features/shared/missing-record';
import { useRouteParam } from '@/navigation/params';

export function RegisterScreen() {
  const router = useRouter();
  const disciplinaId = useRouteParam('disciplinaId');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | null>(null);

  if (!disciplinaId) {
    return (
      <Screen tone="brand" title="Registro de presença" onBack={() => router.back()}>
        <LoadingState />
      </Screen>
    );
  }

  const subject = previewSource.getSubject(disciplinaId);
  if (!subject) return <MissingRecord title="Registro de presença" />;

  function confirm() {
    const digits = code.replace(/\D/g, '');
    if (digits.length !== 6) {
      setError('Informe o código de 6 dígitos.');
      setNotice(null);
      return;
    }
    setError(undefined);
    if (subject?.sessionCode && digits === subject.sessionCode) {
      setNotice('Código reconhecido nesta pré-visualização. O registro ainda não é enviado.');
      return;
    }
    setNotice('Código diferente do exemplo desta aula. Nenhum registro foi enviado.');
  }

  return (
    <Screen tone="brand" title="Registro de presença" subtitle={subject.name} onBack={() => router.back()} keyboard>
      <Card>
        <AppText size="label" tone="muted">
          {subject.nextClassLabel} · {subject.room}
        </AppText>
        <AppText size="body">Peça o código ao professor e digite os 6 dígitos.</AppText>
        {subject.sessionCode ? (
          <AppText size="caption" tone="muted">
            Exemplo desta pré-visualização: {formatSessionCode(subject.sessionCode)}.
          </AppText>
        ) : (
          <AppText size="caption" tone="muted">
            Não há código de exemplo porque esta disciplina não tem chamada aberta.
          </AppText>
        )}
      </Card>
      <TextField
        label="Código da aula"
        value={code}
        onChangeText={setCode}
        placeholder="000 000"
        keyboardType="number-pad"
        autoComplete="off"
        textContentType="oneTimeCode"
        maxLength={7}
        error={error}
      />
      <Button
        label="Confirmar presença"
        onPress={confirm}
        accessibilityHint="Não envia a presença nesta versão"
      />
      {notice ? <Notice message={notice} tone="warning" /> : null}
    </Screen>
  );
}
