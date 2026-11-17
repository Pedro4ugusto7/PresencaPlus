import { confirmationMessage, duplicateMessage, evaluatePublicCheckIn, publicCheckInUrl, remainingLabel } from './public-check-in';
import { checkInExpiresAt, CODE_VALID_MINUTES } from './session-policy';

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

const origin = 'https://chamada.exemplo.edu.br';
const token = 'ab'.repeat(32);
const now = new Date('2026-11-16T22:00:00.000Z');
const session = {
  token,
  status: 'aberta',
  expiresAt: '2026-11-16T22:10:00.000Z',
  endsAt: null,
  classId: 'oferta-5',
  subject: 'Programação de Aplicativos'
};
const roster = [{
  registration: '2026001',
  classId: 'oferta-5',
  name: 'João da Silva',
  confirmed: false
}, {
  registration: '2026002',
  classId: 'oferta-6',
  name: 'Maria Souza',
  confirmed: false
}];

run('a url pública leva só o token', () => {
  const url = publicCheckInUrl(origin, token);
  assert(url === `${origin}/presenca/${token}`, url ?? '');
  assert(url.includes('2026001') === false, 'a matrícula não entra na url');
  assert(url.startsWith('pp1:') === false, 'o qr não usa o formato interno');
});

run('endereço incompleto não vira qr de produção', () => {
  assert(publicCheckInUrl('', token) === null, 'vazio');
  assert(publicCheckInUrl('http://chamada.exemplo.edu.br', token) === null, 'http');
  assert(publicCheckInUrl('https://localhost', token) === null, 'localhost');
  assert(publicCheckInUrl('https://127.0.0.1', token) === null, 'loopback');
  assert(publicCheckInUrl('https://chamada.exemplo.edu.br/presenca', token) === null, 'caminho fixo');
  assert(publicCheckInUrl(origin, '123456') === null, 'código curto');
});

run('token válido confirma só o aluno da oferta', () => {
  const view = evaluatePublicCheckIn({ token, registration: '2026001', now, session, roster });
  assert(view.result === 'presente', view.result);
  assert(confirmationMessage(view.name, view.subject) === 'João da Silva, sua presença em Programação de Aplicativos foi confirmada com sucesso.', 'mensagem');
});

run('token desconhecido ou malformado é inválido', () => {
  assert(evaluatePublicCheckIn({ token: 'cd'.repeat(32), registration: '2026001', now, session, roster }).result === 'invalido', 'outro token');
  assert(evaluatePublicCheckIn({ token: 'pp1:sessao:123456', registration: '2026001', now, session, roster }).result === 'invalido', 'formato interno');
  assert(evaluatePublicCheckIn({ token, registration: '2026001', now, session: null, roster }).result === 'invalido', 'sessão ausente');
});

run('qr vencido não confirma', () => {
  const expired = { ...session, expiresAt: '2026-11-16T21:59:00.000Z' };
  assert(evaluatePublicCheckIn({ token, registration: '2026001', now, session: expired, roster }).result === 'expirada', 'prazo');
  assert(remainingLabel(expired.expiresAt, now) === 'QR Code vencido', 'contador');
});

run('chamada encerrada não confirma', () => {
  const closed = { ...session, status: 'encerrada' };
  assert(evaluatePublicCheckIn({ token, registration: '2026001', now, session: closed, roster }).result === 'encerrada', 'encerrada');
});

run('matrícula inexistente não revela cadastro', () => {
  const view = evaluatePublicCheckIn({ token, registration: '0000000', now, session, roster });
  assert(view.result === 'sem_matricula', view.result);
  assert(view.name == null, 'sem nome');
});

run('matrícula de outra oferta não entra nesta chamada', () => {
  const view = evaluatePublicCheckIn({ token, registration: '2026002', now, session, roster });
  assert(view.result === 'sem_matricula', view.result);
  assert(view.name == null, 'não devolve o aluno da outra oferta');
});

run('confirmação repetida não grava de novo', () => {
  const again = roster.map(item => item.registration === '2026001' ? { ...item, confirmed: true } : item);
  const view = evaluatePublicCheckIn({ token, registration: '2026001', now, session, roster: again });
  assert(view.result === 'duplicada', view.result);
  assert(duplicateMessage(view.name, view.subject) === 'João da Silva, sua presença em Programação de Aplicativos já estava confirmada.', 'mensagem');
});

run('contador mostra o tempo restante', () => {
  assert(remainingLabel(session.expiresAt, now) === 'Faltam 10 min 00 s', remainingLabel(session.expiresAt, now));
});

run('confirma dentro dos 40 minutos e recusa depois do prazo gravado', () => {
  assert(CODE_VALID_MINUTES === 40, 'a confirmação usa o mesmo prazo do aplicativo');
  const start = new Date('2026-11-17T22:00:00.000Z');
  const open = { ...session, expiresAt: checkInExpiresAt(start).toISOString() };
  const inside = evaluatePublicCheckIn({
    token,
    registration: '2026001',
    now: new Date(start.getTime() + 39 * 60_000),
    session: open,
    roster
  });
  const onTheDot = evaluatePublicCheckIn({
    token,
    registration: '2026001',
    now: checkInExpiresAt(start),
    session: open,
    roster
  });
  const late = evaluatePublicCheckIn({
    token,
    registration: '2026001',
    now: new Date(checkInExpiresAt(start).getTime() + 1),
    session: open,
    roster
  });
  assert(inside.result === 'presente', '39 minutos ainda confirma');
  assert(onTheDot.result === 'presente', 'o instante exato do prazo ainda confirma');
  assert(late.result === 'expirada', 'um milissegundo depois do prazo gravado não confirma');
  assert(remainingLabel(open.expiresAt, start) === 'Faltam 40 min 00 s', remainingLabel(open.expiresAt, start));
});

console.log('10 verificações de confirmação pública passaram.');
