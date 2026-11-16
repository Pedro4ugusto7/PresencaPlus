import * as Crypto from 'expo-crypto';

import { getSupabase } from '@/data/remote/client';
import { interpretConfirmation } from '@/domain/check-in-state';
import { CODE_VALID_MINUTES, DAILY_CALL_MESSAGE } from '@/domain/session-policy';

const credentialPattern = /^pp1:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):(\d{6})$/i;

export function attendanceCredential(sessionId: string, code: string): string {
  return `pp1:${sessionId}:${code}`;
}

export function parseAttendanceCredential(value: string): { sessionId: string; code: string } | null {
  const match = credentialPattern.exec(value.trim());
  if (!match?.[1] || !match[2]) return null;
  return { sessionId: match[1], code: match[2] };
}

export async function createSessionCode(): Promise<string> {
  const span = 0x1000000;
  const limit = Math.floor(span / 1_000_000) * 1_000_000;
  let candidate = limit;
  while (candidate >= limit) {
    const bytes = await Crypto.getRandomBytesAsync(3);
    candidate = ((bytes[0] ?? 0) << 16) | ((bytes[1] ?? 0) << 8) | (bytes[2] ?? 0);
  }
  return String(candidate % 1_000_000).padStart(6, '0');
}

type Outcome = { ok: true } | { ok: false; message: string };
type ConfirmOutcome =
  | { ok: true; result: 'presente' | 'duplicada' }
  | { ok: false; result: string; message: string };
type ReadyClient = { ok: true; supabase: NonNullable<ReturnType<typeof getSupabase>> };

function client(): ReadyClient | { ok: false; message: string } {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: 'A conexão com o servidor ainda não está configurada neste aparelho.' };
  return { ok: true, supabase };
}

function confirmMessage(result: string): string {
  switch (result) {
    case 'presente':
      return 'Presença confirmada.';
    case 'duplicada':
      return 'Sua presença nesta chamada já estava confirmada.';
    case 'expirada':
      return 'O código desta chamada não está mais válido.';
    case 'encerrada':
      return 'Esta chamada já foi encerrada.';
    case 'sem_matricula':
      return 'Você não está matriculado nesta turma.';
    case 'codigo_invalido':
      return 'O código não confere com a chamada aberta.';
    case 'papel':
      return 'Somente um aluno autenticado pode confirmar presença.';
    case 'indisponivel':
      return 'Não encontramos uma chamada aberta para este código.';
    default:
      return 'Não foi possível confirmar a presença.';
  }
}

export async function openClassSession(classId: string): Promise<Outcome & { code?: string }> {
  const ready = client();
  if (!ready.ok) return ready;
  try {
    const code = await createSessionCode();
    const expires = new Date(Date.now() + CODE_VALID_MINUTES * 60_000).toISOString();
    const { error } = await ready.supabase
      .from('class_sessions')
      .insert({
        class_id: classId,
        starts_at: new Date().toISOString(),
        code_expires_at: expires,
        status: 'aberta',
        code,
      })
      .select('id')
      .single();
    if (error) {
      const detail = `${error.message} ${error.details ?? ''}`;
      if (detail.includes('class_sessions_one_academic_day')) {
        return { ok: false, message: DAILY_CALL_MESSAGE };
      }
      if (error.code === '23505') {
        return { ok: false, message: 'Esta turma já tem uma chamada aberta.' };
      }
      return { ok: false, message: 'Não foi possível abrir a chamada.' };
    }
    return { ok: true, code };
  } catch {
    return { ok: false, message: 'Não foi possível abrir a chamada.' };
  }
}

export async function confirmAttendance(sessionId: string, code: string): Promise<ConfirmOutcome> {
  const ready = client();
  if (!ready.ok) return { ok: false, result: 'rede', message: ready.message };
  const credential = code.replace(/\D/g, '');
  if (credential.length !== 6) return { ok: false, result: 'codigo_invalido', message: 'Informe o código de 6 dígitos.' };
  const { data, error } = await ready.supabase.rpc('confirm_attendance', {
    target_session: sessionId,
    credential,
  });
  if (error) {
    return { ok: false, result: 'rede', message: 'Não foi possível confirmar a presença. Verifique a conexão.' };
  }
  const result = typeof data === 'object' && data && 'result' in data ? String(data.result) : '';
  if (interpretConfirmation(result) === 'recorded') {
    return { ok: true, result: result === 'duplicada' ? 'duplicada' : 'presente' };
  }
  return { ok: false, result, message: confirmMessage(result) };
}

export async function closeClassSession(sessionId: string): Promise<Outcome> {
  const ready = client();
  if (!ready.ok) return ready;
  const { data, error } = await ready.supabase.rpc('close_class_session', {
    target_session: sessionId,
  });
  if (error) return { ok: false, message: 'Não foi possível encerrar a chamada.' };
  const accepted = typeof data === 'object' && data && 'ok' in data && data.ok === true;
  if (!accepted) {
    const result = typeof data === 'object' && data && 'result' in data ? String(data.result) : '';
    if (result === 'encerrada') return { ok: false, message: 'Esta chamada já foi encerrada.' };
    if (result === 'indisponivel') return { ok: false, message: 'Você não pode encerrar a chamada de outra turma.' };
    return { ok: false, message: 'Não foi possível encerrar a chamada.' };
  }
  return { ok: true };
}
