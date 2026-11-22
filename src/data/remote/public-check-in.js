import { publicApiConfig } from '@/data/remote/client';
import { confirmationMessage, duplicateMessage } from '@/domain/public-check-in';

function endpoint() {
  const config = publicApiConfig();
  if (!config) return null;
  return {
    url: `${config.url.replace(/\/$/, '')}/functions/v1/confirm-presence`,
    key: config.key
  };
}

async function post(body) {
  const target = endpoint();
  if (!target) return { ok: false, result: 'indisponivel', message: 'A página pública ainda não está configurada.' };
  try {
    const response = await fetch(target.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: target.key,
        authorization: `Bearer ${target.key}`
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    return data && typeof data === 'object' ? data : { ok: false, result: 'indisponivel', message: 'Não foi possível consultar a chamada.' };
  } catch {
    return { ok: false, result: 'indisponivel', message: 'Não foi possível consultar a chamada. Verifique a internet.' };
  }
}

export async function lookupPublicCheckIn(token) {
  return post({ action: 'lookup', token });
}

export async function submitPublicCheckIn(token, registration) {
  const data = await post({ action: 'confirm', token, registration });
  if (data.result === 'presente' && data.message) return data;
  if (data.result === 'duplicada' && !data.message && data.name && data.subject) {
    return { ...data, message: duplicateMessage(data.name, data.subject) };
  }
  if (data.result === 'presente' && !data.message && data.name && data.subject) {
    return { ...data, ok: true, message: confirmationMessage(data.name, data.subject) };
  }
  return data;
}

export async function submitPublicAttendanceCode(token, code) {
  const data = await post({ action: 'confirm', token, code });
  if (data.result === 'presente' && data.message) return data;
  if (data.result === 'duplicada' && !data.message && data.name && data.subject) {
    return { ...data, message: duplicateMessage(data.name, data.subject) };
  }
  if (data.result === 'presente' && !data.message && data.name && data.subject) {
    return { ...data, ok: true, message: confirmationMessage(data.name, data.subject) };
  }
  return data;
}
