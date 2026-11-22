import { isCheckInToken } from './public-check-in.js';

export const ATTENDANCE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/;

export function attendanceCodeFromBytes(bytes) {
  if (!bytes || bytes.length < 10) return null;
  let code = '';
  for (let index = 0; index < 10; index += 1) {
    const value = bytes[index];
    if (!Number.isInteger(value) || value < 0 || value > 255) return null;
    code += ATTENDANCE_CODE_ALPHABET[value % 32];
  }
  return code;
}

export function normalizeAttendanceCode(value) {
  if (typeof value !== 'string') return null;
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!CODE_PATTERN.test(compact)) return null;
  return compact;
}

export function formatAttendanceCode(value) {
  const code = normalizeAttendanceCode(value);
  if (!code) return '';
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

export function maskedAttendanceCode() {
  return '•••••-•••••';
}

function closed(session, now) {
  if (!session?.expiresAt) return true;
  if (new Date(session.expiresAt).getTime() <= now.getTime()) return true;
  if (session.endsAt && new Date(session.endsAt).getTime() <= now.getTime()) return true;
  return false;
}

export function evaluateCodeCheckIn({ token, code, now, session, entries }) {
  if (!isCheckInToken(token) || !session || session.token !== token) return { result: 'invalido' };
  if (session.status !== 'aberta') return { result: 'encerrada' };
  if (closed(session, now)) return { result: 'expirada' };
  const normalized = normalizeAttendanceCode(code);
  if (!normalized) return { result: 'codigo_invalido' };
  const match = (entries ?? []).find(item => item.code === normalized && item.sessionToken === token);
  if (!match) return { result: 'codigo_invalido' };
  if (match.active === false || match.revoked === true) return { result: 'sem_matricula' };
  if (match.used === true) return { result: 'duplicada', name: match.name, subject: session.subject };
  return { result: 'presente', name: match.name, subject: session.subject };
}

export function assignAttendanceCodes(students, byteSource) {
  const used = new Set();
  return (students ?? []).map(student => {
    let code = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const next = attendanceCodeFromBytes(byteSource(student.key, attempt));
      if (!next || used.has(next)) continue;
      used.add(next);
      code = next;
      break;
    }
    return { key: student.key, code };
  });
}
