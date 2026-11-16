import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { hasRecoveryPayload, recoveryFromUrl, type RecoveryInput } from '@/data/remote/recovery';
import { toHref } from '@/navigation/area-paths';
import { useAuth } from '@/state/auth-session';

function firstParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function ResetPasswordScreen() {
  const router = useRouter();
  const auth = useAuth();
  const params = useLocalSearchParams<{
    code?: string;
    token_hash?: string;
    access_token?: string;
    refresh_token?: string;
    error_description?: string;
  }>();
  const incomingUrl = Linking.useURL();
  const establishRecovery = useRef(auth.establishRecovery);
  establishRecovery.current = auth.establishRecovery;
  const acceptedPayload = useRef<string | null>(null);
  const [phase, setPhase] = useState<'checking' | 'form' | 'idle'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const fromParams: RecoveryInput = {
      code: firstParam(params.code),
      tokenHash: firstParam(params.token_hash),
      accessToken: firstParam(params.access_token),
      refreshToken: firstParam(params.refresh_token),
      error: firstParam(params.error_description),
    };
    const fromUrl = recoveryFromUrl(incomingUrl);
    const input = hasRecoveryPayload(fromParams) ? fromParams : fromUrl;
    const payloadKey = [input.code, input.tokenHash, input.accessToken, input.error].filter(Boolean).join(':');

    if (!hasRecoveryPayload(input)) {
      setPhase((current) => (current === 'form' ? current : 'idle'));
      return undefined;
    }
    if (acceptedPayload.current === payloadKey) return undefined;

    setPhase('checking');
    establishRecovery.current(input).then((result) => {
      if (!active) return;
      if (!result.ok) {
        setNotice(result.message);
        setPhase('idle');
        return;
      }
      acceptedPayload.current = payloadKey;
      setNotice(null);
      setPhase('form');
    });

    return () => {
      active = false;
    };
  }, [incomingUrl, params.access_token, params.code, params.error_description, params.refresh_token, params.token_hash]);

  async function save() {
    if (password.length < 6) {
      setError('Use ao menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await auth.updatePassword(password);
    setSaving(false);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    router.replace(result.role === 'professor' ? toHref('/professor') : toHref('/aluno'));
  }

  return (
    <Screen tone="plain" keyboard>
      <AppText size="title" accessibilityRole="header">
        Nova senha
      </AppText>
      {phase === 'checking' ? (
        <AppText size="label" tone="muted">
          Validando o link de recuperação…
        </AppText>
      ) : null}
      {phase === 'idle' ? (
        <AppText size="label" tone="muted">
          Abra o link recebido por e-mail neste aparelho para escolher uma nova senha.
        </AppText>
      ) : null}
      {phase === 'form' ? (
        <>
          <AppText size="label" tone="muted">
            Escolha uma senha nova para esta conta.
          </AppText>
          <TextField
            label="Nova senha"
            value={password}
            onChangeText={setPassword}
            placeholder="Nova senha"
            secure
            autoCapitalize="none"
            textContentType="password"
            error={error}
          />
          <TextField
            label="Confirmar senha"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repita a senha"
            secure
            autoCapitalize="none"
            textContentType="password"
          />
          <Button label={saving ? 'Salvando…' : 'Atualizar senha'} onPress={() => void save()} disabled={saving} />
        </>
      ) : null}
      {notice ? <Notice message={notice} tone="warning" /> : null}
    </Screen>
  );
}
