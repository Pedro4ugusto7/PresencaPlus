import * as Crypto from 'expo-crypto';
import { getSupabase } from '@/data/remote/client';
import { interpretConfirmation } from '@/domain/check-in-state';
import { checkInExpiresAt, DAILY_CALL_MESSAGE } from '@/domain/session-policy';
const credentialPattern = /^pp1:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):(\d{6})$/i;
export function attendanceCredential(sessionId, code) {
  return `pp1:${sessionId}:${code}`;
}
export function parseAttendanceCredential(value) {
  const match = credentialPattern.exec(value.trim());
  if (!match?.[1] || !match[2]) return null;
  return {
    sessionId: match[1],
    code: match[2]
  };
}
export async function createCheckInToken() {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
async function checkInTokenHash(token) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, token);
}
function missingPublicTokenColumn(error) {
  const detail = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  return detail.includes('check_in_token');
}
export async function createSessionCode() {
  const span = 0x1000000;
  const limit = Math.floor(span / 1_000_000) * 1_000_000;
  let candidate = limit;
  while (candidate >= limit) {
    const bytes = await Crypto.getRandomBytesAsync(3);
    candidate = (bytes[0] ?? 0) << 16 | (bytes[1] ?? 0) << 8 | (bytes[2] ?? 0);
  }
  return String(candidate % 1_000_000).padStart(6, '0');
}
function client() {
  const supabase = getSupabase();
  if (!supabase) return {
    ok: false,
    message: 'A conexão com o servidor ainda não está configurada neste aparelho.'
  };
  return {
    ok: true,
    supabase
  };
}
function confirmMessage(result) {
  switch (result) {
    case 'presente':
      return 'Presença confirmada.';
    case 'duplicada':
      return 'Sua presença nesta chamada já estava confirmada.';
    case 'expirada':
      return 'Este QR Code venceu. Peça ao professor para abrir uma nova chamada.';
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
export async function ensureCheckInToken(sessionId) {
  const ready = client();
  if (!ready.ok) return null;
  try {
    const token = await createCheckInToken();
    const tokenHash = await checkInTokenHash(token);
    const {
      data,
      error
    } = await ready.supabase.from('class_sessions').update({
      check_in_token: token,
      check_in_token_hash: tokenHash
    }).eq('id', sessionId).is('check_in_token', null).select('id');
    if (error || !data?.length) return null;
    return token;
  } catch {
    return null;
  }
}
export async function openClassSession(classId) {
  const ready = client();
  if (!ready.ok) return ready;
  try {
    const code = await createSessionCode();
    const token = await createCheckInToken();
    const tokenHash = await checkInTokenHash(token);
    const startsAt = new Date();
    const expires = checkInExpiresAt(startsAt).toISOString();
    const baseRow = {
      class_id: classId,
      starts_at: startsAt.toISOString(),
      code_expires_at: expires,
      status: 'aberta',
      code
    };
    let {
      error
    } = await ready.supabase.from('class_sessions').insert({
      ...baseRow,
      check_in_token: token,
      check_in_token_hash: tokenHash
    }).select('id').single();
    if (error && missingPublicTokenColumn(error)) {
      const fallback = await ready.supabase.from('class_sessions').insert(baseRow).select('id').single();
      error = fallback.error;
    }
    if (error) {
      const detail = `${error.message} ${error.details ?? ''}`;
      if (detail.includes('class_sessions_one_academic_day')) {
        return {
          ok: false,
          message: DAILY_CALL_MESSAGE
        };
      }
      if (error.code === '23505') {
        return {
          ok: false,
          message: 'Esta turma já tem uma chamada aberta.'
        };
      }
      return {
        ok: false,
        message: 'Não foi possível abrir a chamada.'
      };
    }
    return {
      ok: true,
      code
    };
  } catch {
    return {
      ok: false,
      message: 'Não foi possível abrir a chamada.'
    };
  }
}
export async function confirmAttendance(sessionId, code) {
  const ready = client();
  if (!ready.ok) return {
    ok: false,
    result: 'rede',
    message: ready.message
  };
  const credential = code.replace(/\D/g, '');
  if (credential.length !== 6) return {
    ok: false,
    result: 'codigo_invalido',
    message: 'Informe o código de 6 dígitos.'
  };
  const {
    data,
    error
  } = await ready.supabase.rpc('confirm_attendance', {
    target_session: sessionId,
    credential
  });
  if (error) {
    return {
      ok: false,
      result: 'rede',
      message: 'Não foi possível confirmar a presença. Verifique a conexão.'
    };
  }
  const result = typeof data === 'object' && data && 'result' in data ? String(data.result) : '';
  if (interpretConfirmation(result) === 'recorded') {
    return {
      ok: true,
      result: result === 'duplicada' ? 'duplicada' : 'presente'
    };
  }
  return {
    ok: false,
    result,
    message: confirmMessage(result)
  };
}
export async function closeClassSession(sessionId) {
  const ready = client();
  if (!ready.ok) return ready;
  const {
    data,
    error
  } = await ready.supabase.rpc('close_class_session', {
    target_session: sessionId
  });
  if (error) return {
    ok: false,
    message: 'Não foi possível encerrar a chamada.'
  };
  const accepted = typeof data === 'object' && data && 'ok' in data && data.ok === true;
  if (!accepted) {
    const result = typeof data === 'object' && data && 'result' in data ? String(data.result) : '';
    if (result === 'encerrada') return {
      ok: false,
      message: 'Esta chamada já foi encerrada.'
    };
    if (result === 'indisponivel') return {
      ok: false,
      message: 'Você não pode encerrar a chamada de outra turma.'
    };
    return {
      ok: false,
      message: 'Não foi possível encerrar a chamada.'
    };
  }
  return {
    ok: true
  };
}
