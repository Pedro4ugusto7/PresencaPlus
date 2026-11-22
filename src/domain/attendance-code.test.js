import { readFileSync } from 'node:fs';
import { attendanceCodeFromBytes, assignAttendanceCodes, evaluateCodeCheckIn, formatAttendanceCode, normalizeAttendanceCode } from './attendance-code.js';
import { createAttemptLimiter } from './attempt-limit.js';
import { confirmationMessage } from './public-check-in.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function run(name, check) {
  try {
    check();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'falhou';
    throw new Error(`${name}: ${message}`);
  }
}

const token = 'ab'.repeat(32);
const otherToken = 'cd'.repeat(32);
const now = new Date('2026-11-16T22:00:00.000Z');
const session = {
  token,
  status: 'aberta',
  expiresAt: '2026-11-16T22:40:00.000Z',
  endsAt: null,
  subject: 'Cálculo'
};
const ana = {
  code: 'ABCDEFGHJK',
  sessionToken: token,
  name: 'Ana Lima',
  active: true,
  used: false,
  revoked: false
};

run('o mesmo sorteio produz o mesmo código e outro sorteio produz outro', () => {
  const first = attendanceCodeFromBytes([0, 32, 64, 96, 128, 160, 192, 224, 1, 2]);
  const again = attendanceCodeFromBytes([0, 32, 64, 96, 128, 160, 192, 224, 1, 2]);
  const other = attendanceCodeFromBytes([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert(first === again && first !== other, `${first} ${other}`);
  assert(normalizeAttendanceCode(formatAttendanceCode(first)) === first, 'formato estável');
  assert(normalizeAttendanceCode('abcde-fghjk') === 'ABCDEFGHJK', 'hífen e minúsculas');
  assert(normalizeAttendanceCode('abcd0-fghij') === null, 'letras ambíguas');
});

run('cada aluno da chamada recebe um código exclusivo', () => {
  let seed = 1;
  const assigned = assignAttendanceCodes([{ key: 'ana' }, { key: 'bia' }, { key: 'ana' }], () => {
    const bytes = Array.from({ length: 10 }, () => seed);
    seed += 1;
    return bytes;
  });
  assert(assigned[0].code && assigned[1].code && assigned[0].code !== assigned[1].code, 'exclusivos');
  assert(assigned[2].code !== assigned[0].code, 'outra linha não reaproveita');
});

run('código válido confirma o aluno e não vai no QR', () => {
  const view = evaluateCodeCheckIn({ token, code: 'abcde-fghjk', now, session, entries: [ana] });
  assert(view.result === 'presente' && view.name === 'Ana Lima', view.result);
  assert(confirmationMessage(view.name, view.subject).includes('Ana Lima'), 'nome');
  assert(token.includes(ana.code) === false, 'o token do QR não contém o código');
});

run('código inválido, de outra chamada, usado, expirado ou sem matrícula não confirma', () => {
  assert(evaluateCodeCheckIn({ token, code: 'ZZZZZ-ZZZZZ', now, session, entries: [ana] }).result === 'codigo_invalido', 'inexistente');
  assert(evaluateCodeCheckIn({ token: otherToken, code: ana.code, now, session: { ...session, token: otherToken }, entries: [ana] }).result === 'codigo_invalido', 'outra chamada');
  assert(evaluateCodeCheckIn({ token, code: ana.code, now, session, entries: [{ ...ana, used: true }] }).result === 'duplicada', 'reutilizado');
  assert(evaluateCodeCheckIn({ token, code: ana.code, now, session: { ...session, expiresAt: '2026-11-16T21:00:00.000Z' }, entries: [ana] }).result === 'expirada', 'expirado');
  assert(evaluateCodeCheckIn({ token, code: ana.code, now, session: { ...session, status: 'encerrada' }, entries: [ana] }).result === 'encerrada', 'encerrada durante a confirmação');
  assert(evaluateCodeCheckIn({ token, code: ana.code, now, session, entries: [{ ...ana, active: false }] }).result === 'sem_matricula', 'matrícula encerrada');
  assert(evaluateCodeCheckIn({ token, code: ana.code, now, session, entries: [{ ...ana, revoked: true }] }).result === 'sem_matricula', 'código revogado');
});

run('tentativas repetidas passam do limite', () => {
  const limited = createAttemptLimiter({ windowMs: 600000, limit: 10 });
  const start = Date.parse('2026-11-16T22:00:00.000Z');
  let blocked = false;
  for (let attempt = 0; attempt < 12; attempt += 1) blocked = limited('token:abc', start);
  assert(blocked === true, 'limite do token');
  assert(limited('token:abc', start + 600001) === false, 'janela seguinte recomeça');
});

run('a migração não publica a tabela de códigos e a função antiga permanece', () => {
  const sql = readFileSync(new URL('../../supabase/migrations/20261121120000_individual_attendance_codes.sql', import.meta.url), 'utf8');
  const edge = readFileSync(new URL('../../supabase/functions/confirm-presence/index.js', import.meta.url), 'utf8');
  assert(sql.includes('revoke all on table private.session_attendance_codes from public, anon, authenticated'), 'sem leitura pública');
  assert(sql.includes('grant select on table private.session_attendance_codes') === false, 'sem grant de select');
  assert(sql.includes('confirm_public_attendance_by_code'), 'confirmação nova');
  assert(sql.includes("if session_mode = 'codigo' then"), 'matrícula recusada na chamada nova');
  assert(sql.includes("default 'matricula'"), 'chamada antiga preservada');
  assert(edge.includes('confirm_public_attendance_by_code'), 'função nova');
  assert(edge.includes("callRpc('confirm_public_attendance',"), 'função antiga só no caminho legado');
  assert(edge.includes('console.') === false, 'sem log');
  assert(sql.includes("check_in_blocked('token:") === false, 'erros não usam o token da turma');
  assert(sql.includes('class_sessions_issue_codes'), 'a chamada e os códigos são a mesma transação');
});
