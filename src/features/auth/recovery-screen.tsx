import { useState } from 'react';
import { Pressable } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { pendingMessages } from '@/content/messages';
import { useGoBack } from '@/navigation/use-go-back';
import { hitSlop } from '@/theme';

export function RecoveryScreen() {
  const goBack = useGoBack();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | null>(null);

  function submit() {
    if (!email.trim().includes('@')) {
      setError('Informe o e-mail institucional.');
      setNotice(null);
      return;
    }
    setError(undefined);
    setNotice(pendingMessages.recovery);
  }

  return (
    <Screen tone="plain" keyboard>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={hitSlop} onPress={goBack}>
        <AppText size="label" tone="accent">
          Voltar
        </AppText>
      </Pressable>
      <AppText size="title" accessibilityRole="header">
        Recuperar senha
      </AppText>
      <AppText size="label" tone="muted">
        Informe o e-mail institucional. Nesta versão nenhuma mensagem é enviada.
      </AppText>
      <TextField
        label="E-mail institucional"
        value={email}
        onChangeText={setEmail}
        placeholder="nome@exemplo.edu.br"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        error={error}
      />
      <Button
        label="Enviar instruções"
        onPress={submit}
        accessibilityHint="Não envia e-mail nesta versão"
      />
      {notice ? <Notice message={notice} tone="warning" /> : null}
    </Screen>
  );
}
