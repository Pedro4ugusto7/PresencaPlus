const TOKEN_PATTERN = /^[0-9a-f]{64}$/;

export function isCheckInToken(value) {
  return typeof value === 'string' && TOKEN_PATTERN.test(value);
}

export function normalizeRegistration(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 40) return null;
  if (/[\u0000-\u001f]/.test(trimmed)) return null;
  return trimmed;
}

export function publicCheckInOrigin(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (url.username || url.password || url.search || url.hash) return null;
  if (url.pathname !== '/' && url.pathname !== '') return null;
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1' || host === '::1' || host === '[::1]') return null;
  if (!host.includes('.')) return null;
  return url.origin;
}

export function publicCheckInUrl(origin, token) {
  const base = publicCheckInOrigin(origin);
  if (!base || !isCheckInToken(token)) return null;
  return `${base}/presenca/${token}`;
}

export function confirmationMessage(name, subject) {
  return `${name}, sua presença em ${subject} foi confirmada com sucesso.`;
}

export function duplicateMessage(name, subject) {
  return `${name}, sua presença em ${subject} já estava confirmada.`;
}

export function remainingLabel(expiresAt, now) {
  const left = new Date(expiresAt).getTime() - now.getTime();
  if (!Number.isFinite(left) || left <= 0) return 'QR Code vencido';
  const total = Math.floor(left / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `Faltam ${minutes} min ${String(seconds).padStart(2, '0')} s`;
}

function expired(session, now) {
  if (!session.expiresAt) return true;
  return new Date(session.expiresAt).getTime() < now.getTime();
}

function ended(session, now) {
  if (!session.endsAt) return false;
  return new Date(session.endsAt).getTime() < now.getTime();
}

export function evaluatePublicCheckIn({ token, registration, now, session, roster }) {
  if (!isCheckInToken(token) || !session || session.token !== token) {
    return { result: 'invalido' };
  }
  if (session.status !== 'aberta') return { result: 'encerrada' };
  if (expired(session, now) || ended(session, now)) return { result: 'expirada' };
  const code = normalizeRegistration(registration);
  if (!code) return { result: 'sem_matricula' };
  const match = (roster ?? []).find(item => item.registration === code && item.classId === session.classId);
  if (!match) return { result: 'sem_matricula' };
  if (match.confirmed) {
    return { result: 'duplicada', name: match.name, subject: session.subject };
  }
  return { result: 'presente', name: match.name, subject: session.subject };
}
