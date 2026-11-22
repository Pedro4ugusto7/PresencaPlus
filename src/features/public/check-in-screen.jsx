import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/app-text';
import { LoadingState } from '@/components/ui/loading-state';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { lookupPublicCheckIn, submitPublicAttendanceCode, submitPublicCheckIn } from '@/data/remote/public-check-in';
import { isCheckInToken } from '@/domain/public-check-in';
import { normalizeAttendanceCode } from '@/domain/attendance-code';

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
  const [code, setCode] = useState('');
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
    const individual = view?.checkInMode === 'codigo';
    if (individual) {
      const normalized = normalizeAttendanceCode(code);
      if (!normalized) {
        setError('Informe o código individual de 10 caracteres.');
        return;
      }
      setError(undefined);
      setSaving(true);
      const result = await submitPublicAttendanceCode(token, normalized);
      setSaving(false);
      finish(result);
      return;
    }
    const trimmed = registration.trim();
    if (!trimmed) {
      setError('Informe a matrícula.');
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await submitPublicCheckIn(token, trimmed);
    setSaving(false);
    finish(result);
  }

  function finish(result) {
    if (result.result === 'presente' || result.result === 'duplicada') {
      setDone(result.message);
      return;
    }
    if (result.result === 'expirada' || result.result === 'encerrada' || result.result === 'invalido' || result.result === 'codigo_obrigatorio') {
      setView(result);
      return;
    }
    setError(result.message || 'Não foi possível confirmar a presença.');
  }

  const open = view?.result === 'aberta' && !done;
  const individual = view?.checkInMode === 'codigo';
  const operationNotice = done ? done : view && !open ? view.message || 'Este QR Code não é válido.' : null;
  const operationTone = done ? done.includes('já estava') ? 'info' : 'success' : 'warning';
  return <Screen tone="brand" title="Confirmar presença" subtitle={view ? callLabel(view) || 'Chamada da aula' : 'Chamada da aula'} keyboard notice={operationNotice} noticeTone={operationTone}>
      {!view ? <LoadingState message="Consultando a chamada…" /> : null}
      {open && individual ? <>
          <AppText size="label" tone="muted">
            Informe o código individual que o professor mostrou para você. A matrícula não confirma esta chamada.
          </AppText>
          <TextField label="Código individual de presença" value={code} onChangeText={setCode} autoCapitalize="characters" maxLength={14} error={error} />
          <Button label={saving ? 'Confirmando…' : 'Confirmar presença'} onPress={() => void confirm()} disabled={saving} />
        </> : null}
      {open && !individual ? <>
          <AppText size="label" tone="muted">
            Esta chamada foi aberta antes dos códigos individuais. Informe a matrícula cadastrada nesta turma.
          </AppText>
          <TextField label="Matrícula" value={registration} onChangeText={setRegistration} autoCapitalize="none" maxLength={40} error={error} />
          <Button label={saving ? 'Confirmando…' : 'Confirmar presença'} onPress={() => void confirm()} disabled={saving} />
        </> : null}
      {open ? <AppText size="caption" tone="muted">
          {individual ? 'O código vale só para esta chamada. Ele deixa de funcionar depois do uso, do encerramento ou do prazo de 40 minutos. Compartilhar o próprio código ainda permite que outra pessoa o utilize.' : 'A matrícula confirma somente esta chamada antiga, dentro do prazo de 40 minutos. Uma chamada vencida não registra presença.'}
        </AppText> : null}
    </Screen>;
}
