import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/app-text';
import { LoadingState } from '@/components/ui/loading-state';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { lookupPublicCheckIn, submitPublicCheckIn } from '@/data/remote/public-check-in';
import { isCheckInToken, normalizeRegistration } from '@/domain/public-check-in';

function firstParam(value) {
  return typeof value === 'string' ? value : '';
}

function callLabel(view) {
  return [view?.subject, view?.group, view?.period].filter(Boolean).join(' · ');
}

export function PublicCheckInScreen() {
  const params = useLocalSearchParams();
  const token = firstParam(params.token);
  const [view, setView] = useState(null);
  const [registration, setRegistration] = useState('');
  const [error, setError] = useState();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (!isCheckInToken(token)) {
      setView({ ok: false, result: 'invalido', message: 'Este QR Code não é válido.' });
      return undefined;
    }
    let active = true;
    lookupPublicCheckIn(token).then(result => {
      if (active) setView(result);
    });
    return () => {
      active = false;
    };
  }, [token]);

  async function confirm() {
    const code = normalizeRegistration(registration);
    if (!code) {
      setError('Informe a matrícula.');
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await submitPublicCheckIn(token, code);
    setSaving(false);
    if (result.result === 'presente' || result.result === 'duplicada') {
      setDone(result.message);
      return;
    }
    if (result.result === 'expirada' || result.result === 'encerrada' || result.result === 'invalido') {
      setView(result);
      return;
    }
    setError(result.message || 'Não foi possível confirmar a presença.');
  }

  const open = view?.result === 'aberta' && !done;
  return <Screen tone="brand" title="Confirmar presença" subtitle={view ? callLabel(view) || 'Chamada da aula' : 'Chamada da aula'} keyboard>
      {!view ? <LoadingState message="Consultando a chamada…" /> : null}
      {view && !open && !done ? <Notice message={view.message || 'Este QR Code não é válido.'} tone="warning" /> : null}
      {done ? <Notice message={done} tone={done.includes('já estava') ? 'info' : 'success'} /> : null}
      {open ? <>
          <AppText size="label" tone="muted">
            Informe somente a matrícula desta disciplina. Não é preciso criar conta nem senha.
          </AppText>
          <TextField label="Matrícula" value={registration} onChangeText={setRegistration} autoCapitalize="none" maxLength={40} error={error} />
          <Button label={saving ? 'Confirmando…' : 'Confirmar presença'} onPress={() => void confirm()} disabled={saving} />
        </> : null}
      <AppText size="caption" tone="muted">
        A matrícula não comprova quem está com o celular. Ela só registra o aluno matriculado nesta chamada.
      </AppText>
    </Screen>;
}
