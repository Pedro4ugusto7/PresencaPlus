import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { connectionMessages } from '@/content/messages';
import { useGoBack } from '@/navigation/use-go-back';
import { useAuth } from '@/state/auth-session';
import { hitSlop } from '@/theme';
export function RecoveryScreen() {
  const goBack = useGoBack();
  const auth = useAuth();
  const redirectTo = Linking.createURL('/redefinir-senha');
  const [email, setEmail] = useState('');
  const [error, setError] = useState();
  const [notice, setNotice] = useState(null);
  const [noticeTone, setNoticeTone] = useState('info');
  const [submitting, setSubmitting] = useState(false);
  async function submit() {
    if (!email.trim().includes('@')) {
      setError('Informe o e-mail institucional.');
      setNotice(null);
      return;
    }
    setError(undefined);
    setSubmitting(true);
    const result = await auth.requestPasswordReset(email, redirectTo);
    setSubmitting(false);
    if (!result.ok) {
      setNoticeTone('warning');
      setNotice(result.message);
      return;
    }
    setNoticeTone('info');
    setNotice(connectionMessages.recoveryAccepted);
  }
  return <Screen tone="plain" keyboard>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={hitSlop} onPress={goBack}>
        <AppText size="label" tone="accent">
          Voltar
        </AppText>
      </Pressable>
      <AppText size="title" accessibilityRole="header">
        Recuperar senha
      </AppText>
      <AppText size="label" tone="muted">
        Informe o e-mail da conta. O link precisa ser aberto neste aparelho.
      </AppText>
      <TextField label="E-mail institucional" value={email} onChangeText={setEmail} placeholder="nome@exemplo.edu.br" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" error={error} />
      <AppText size="caption" tone="muted">
        Endereço de retorno deste aparelho: {redirectTo}
      </AppText>
      <Button label={submitting ? 'Enviando…' : 'Enviar instruções'} onPress={() => void submit()} disabled={submitting} />
      {notice ? <Notice message={notice} tone={noticeTone} /> : null}
    </Screen>;
}
