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
import { pendingMessages } from '@/content/messages';
import { useGoBack } from '@/navigation/use-go-back';
import { hitSlop, palette, spacing } from '@/theme';

export function LoginScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | null>(null);

  function submit() {
    const nextEmailError = email.trim().includes('@') ? undefined : 'Informe um e-mail institucional.';
    const nextPasswordError = password.length >= 6 ? undefined : 'Use ao menos 6 caracteres.';
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setNotice(nextEmailError || nextPasswordError ? null : pendingMessages.auth);
  }

  return (
    <Screen tone="plain" keyboard>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={hitSlop} onPress={goBack}>
        <AppText size="label" tone="accent">
          Voltar
        </AppText>
      </Pressable>
      <View style={styles.brand}>
        <LogoMark size={56} variant="onLight" />
        <AppText size="title">Entrar</AppText>
        <AppText size="label" tone="muted">
          Use as credenciais que a instituição fornecer. O acesso real ainda não está conectado.
        </AppText>
      </View>
      <TextField
        label="E-mail institucional"
        value={email}
        onChangeText={setEmail}
        placeholder="nome@exemplo.edu.br"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        error={emailError}
      />
      <TextField
        label="Senha"
        value={password}
        onChangeText={setPassword}
        placeholder="Sua senha"
        secure
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
        error={passwordError}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Recuperar senha"
        hitSlop={hitSlop}
        onPress={() => router.push('/recuperar-senha')}>
        <AppText size="label" tone="accent">
          Esqueci minha senha
        </AppText>
      </Pressable>
      <Button label="Entrar" onPress={submit} accessibilityHint="Não realiza login nesta versão" />
      {notice ? <Notice message={notice} /> : null}

      <Card>
        <AppText size="heading">Modo demonstração</AppText>
        <AppText size="label" tone="muted">
          Pré-visualize os dois perfis com dados locais. Isso não autentica e pode ser removido quando o acesso real existir.
        </AppText>
        <Button
          label="Pré-visualizar como professor"
          variant="secondary"
          onPress={() => router.push('/demo/professor')}
        />
        <Button
          label="Pré-visualizar como aluno"
          variant="secondary"
          onPress={() => router.push('/demo/aluno')}
        />
      </Card>
      <View style={styles.spacer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    gap: spacing.sm,
  },
  spacer: {
    height: spacing.lg,
    backgroundColor: palette.background,
  },
});
