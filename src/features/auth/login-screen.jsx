import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogoMark } from '@/components/ui/logo-mark';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { connectionMessages } from '@/content/messages';
import { useGoBack } from '@/navigation/use-go-back';
import { toHref } from '@/navigation/area-paths';
import { useAuth } from '@/state/auth-session';
import { hitSlop, palette, spacing } from '@/theme';
export function LoginScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState();
  const [passwordError, setPasswordError] = useState();
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  async function submit() {
    const nextEmailError = email.trim().includes('@') ? undefined : 'Informe um e-mail institucional.';
    const nextPasswordError = password.length >= 6 ? undefined : 'Use ao menos 6 caracteres.';
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) {
      setNotice(null);
      return;
    }
    setSubmitting(true);
    const result = await auth.signIn(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    router.replace(toHref('/professor'));
  }
  const accountMessage = notice ?? auth.accountMessage;
  return <Screen tone="plain" keyboard notice={accountMessage} noticeTone="warning">
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={hitSlop} onPress={goBack}>
        <AppText size="label" tone="accent">
          Voltar
        </AppText>
      </Pressable>
      <View style={styles.brand}>
        <LogoMark size={56} variant="onLight" />
        <AppText size="title">Entrar</AppText>
        <AppText size="label" tone="muted">
          Acesso exclusivo do professor, com o e-mail e a senha da instituição.
        </AppText>
      </View>
      <TextField label="E-mail institucional" value={email} onChangeText={setEmail} placeholder="nome@exemplo.edu.br" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" error={emailError} />
      <TextField label="Senha" value={password} onChangeText={setPassword} placeholder="Sua senha" secure autoCapitalize="none" autoComplete="password" textContentType="password" error={passwordError} />
      <Pressable accessibilityRole="button" accessibilityLabel="Recuperar senha" hitSlop={hitSlop} onPress={() => router.push('/recuperar-senha')}>
        <AppText size="label" tone="accent">
          Esqueci minha senha
        </AppText>
      </Pressable>
      <Button label={submitting ? 'Entrando…' : 'Entrar'} onPress={() => void submit()} disabled={submitting} />
      {auth.status === 'needsProfile' || auth.status === 'profileError' ? <Button label="Sair da conta" variant="secondary" onPress={() => void auth.signOut()} /> : null}
      {!auth.configured ? <Notice message={auth.setupIssue ?? connectionMessages.unconfigured} tone="warning" /> : null}

      <Card>
        <AppText size="heading">Modo demonstração</AppText>
        <AppText size="label" tone="muted">
          Pré-visualize o painel do professor com dados locais. Isso não autentica e não usa a conta real.
        </AppText>
        <Button label="Pré-visualizar como professor" variant="secondary" onPress={() => router.push('/demo/professor')} />
      </Card>
      <View style={styles.spacer} />
    </Screen>;
}
const styles = StyleSheet.create({
  brand: {
    gap: spacing.sm
  },
  spacer: {
    height: spacing.lg,
    backgroundColor: palette.background
  }
});
