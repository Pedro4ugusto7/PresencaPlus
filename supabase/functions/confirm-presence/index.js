const TOKEN_PATTERN = /^[0-9a-f]{64}$/;
const WINDOW_MS = 60_000;
const IP_LIMIT = 120;
const buckets = new Map();

function headers() {
  return {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, apikey, authorization',
    'access-control-allow-methods': 'POST, OPTIONS',
    'cache-control': 'no-store'
  };
}

function reply(status, body) {
  return new Response(JSON.stringify(body), { status, headers: headers() });
}

function limited(key, now, windowMs, limit) {
  const current = buckets.get(key);
  if (!current || now >= current.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  current.count += 1;
  return current.count > limit;
}

function clientAddress(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'desconhecido';
}

function normalizeRegistration(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 40) return null;
  if (/[\u0000-\u001f]/.test(trimmed)) return null;
  return trimmed;
}

function confirmationMessage(name, subject) {
  return `${name}, sua presença em ${subject} foi confirmada com sucesso.`;
}

function duplicateMessage(name, subject) {
  return `${name}, sua presença em ${subject} já estava confirmada.`;
}

function publicMessage(result, name, subject) {
  if (result === 'presente' && name && subject) return confirmationMessage(name, subject);
  if (result === 'duplicada' && name && subject) return duplicateMessage(name, subject);
  if (result === 'expirada') return 'Este QR Code venceu. Peça ao professor para abrir uma nova chamada.';
  if (result === 'encerrada') return 'Esta chamada já foi encerrada.';
  if (result === 'codigo_obrigatorio') return 'Esta chamada exige o código individual de presença. A matrícula não confirma.';
  if (result === 'codigo_invalido' || result === 'sem_matricula') return 'Este código não vale para esta chamada.';
  if (result === 'limite') return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  return 'Este QR Code não é válido.';
}

async function callRpc(name, args) {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return { ok: false, unavailable: true };
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: key,
      authorization: `Bearer ${key}`
    },
    body: JSON.stringify(args)
  });
  if (!response.ok) return { ok: false, unavailable: true };
  return { ok: true, data: await response.json() };
}

function present(data) {
  const result = typeof data?.result === 'string' ? data.result : 'invalido';
  const name = typeof data?.name === 'string' ? data.name : null;
  const subject = typeof data?.subject === 'string' ? data.subject : null;
  return {
    ok: result === 'presente' || result === 'aberta',
    result,
    message: result === 'aberta' ? null : publicMessage(result, name, subject),
    subject,
    group: typeof data?.group === 'string' ? data.group : null,
    period: typeof data?.period === 'string' ? data.period : null,
    expiresAt: typeof data?.expires_at === 'string' ? data.expires_at : null,
    checkInMode: data?.check_in_mode === 'codigo' || data?.check_in_mode === 'matricula' ? data.check_in_mode : null
  };
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers() });
  if (request.method !== 'POST') return reply(405, { ok: false, result: 'invalido', message: 'Este QR Code não é válido.' });

  let body;
  try {
    body = await request.json();
  } catch {
    return reply(400, { ok: false, result: 'invalido', message: 'Este QR Code não é válido.' });
  }

  const action = body?.action === 'confirm' ? 'confirm' : body?.action === 'lookup' ? 'lookup' : null;
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  if (!action || !TOKEN_PATTERN.test(token)) {
    return reply(200, { ok: false, result: 'invalido', message: 'Este QR Code não é válido.' });
  }

  const now = Date.now();
  const address = clientAddress(request);
  const individualCode = typeof body?.code === 'string' ? body.code : null;
  const confirmingByCode = action === 'confirm' && individualCode != null && individualCode.trim() !== '';
  if (!confirmingByCode && limited(`ip:${address}`, now, WINDOW_MS, IP_LIMIT)) {
    return reply(429, { ok: false, result: 'limite', message: 'Muitas tentativas. Aguarde um minuto e tente de novo.' });
  }

  if (action === 'lookup') {
    const result = await callRpc('describe_public_check_in', { token });
    if (!result.ok) return reply(503, { ok: false, result: 'indisponivel', message: 'Não foi possível consultar a chamada. Tente de novo.' });
    const view = present(result.data);
    return reply(200, {
      ok: view.ok,
      result: view.result,
      message: view.message,
      subject: view.subject,
      group: view.group,
      period: view.period,
      expiresAt: view.expiresAt,
      checkInMode: view.checkInMode
    });
  }

  if (confirmingByCode) {
    const result = await callRpc('confirm_public_attendance_by_code', {
      token,
      attendance_code: individualCode,
      client_ip: address
    });
    if (!result.ok) return reply(503, { ok: false, result: 'indisponivel', message: 'Não foi possível confirmar a presença. Tente de novo.' });
    const view = present(result.data);
    const status = view.result === 'limite' ? 429 : 200;
    return reply(status, { ok: view.result === 'presente', result: view.result, message: view.message, checkInMode: view.checkInMode });
  }

  const registration = normalizeRegistration(body?.registration);
  if (!registration) {
    return reply(200, { ok: false, result: 'codigo_invalido', message: 'Informe o código individual de presença.' });
  }

  const result = await callRpc('confirm_public_attendance', { token, registration });
  if (!result.ok) return reply(503, { ok: false, result: 'indisponivel', message: 'Não foi possível confirmar a presença. Tente de novo.' });
  const view = present(result.data);
  return reply(200, { ok: view.result === 'presente', result: view.result, message: view.message, checkInMode: view.checkInMode });
});
