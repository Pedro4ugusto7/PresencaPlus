import { isAcademicToday } from './academic-time';
import {
  canSubmitCheckIn,
  confirmedPresenceMessage,
  describeStudentCheckIn,
  interpretConfirmation,
} from './check-in-state';
import type { StudentCallState } from './types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const discipline = 'Programação de Aplicativos';
const now = new Date('2026-11-16T15:00:00.000Z');

function call(partial: Partial<StudentCallState> & Pick<StudentCallState, 'sessionId'>): StudentCallState {
  return {
    status: 'aberta',
    startsAt: '2026-11-16T14:00:00.000Z',
    codeExpiresAt: '2026-11-16T16:00:00.000Z',
    mark: null,
    ...partial,
  };
}

function run(name: string, check: () => void): void {
  try {
    check();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'falhou';
    throw new Error(`${name}: ${message}`);
  }
}

run('confirmação inicial deixa a chamada pendente', () => {
  const view = describeStudentCheckIn({
    discipline,
    current: call({ sessionId: 'sessao-a' }),
    now,
  });
  assert(view.kind === 'pending' && view.actionsEnabled, 'a primeira chamada precisa aceitar o registro');
  assert(canSubmitCheckIn(view.actionsEnabled, 'idle'), 'código e QR usam a mesma liberação');
});

run('presença gravada bloqueia código e QR na mesma hora', () => {
  const view = describeStudentCheckIn({
    discipline,
    current: call({ sessionId: 'sessao-a', mark: 'presente' }),
    now,
  });
  assert(view.kind === 'confirmed' && !view.actionsEnabled, 'a sessão confirmada não aceita outro registro');
  assert(!canSubmitCheckIn(view.actionsEnabled, 'idle'), 'os dois botões ficam bloqueados');
  assert(view.message === `Sua presença na disciplina ${discipline} foi confirmada hoje.`, view.message ?? '');
});

run('novo login lê o mesmo registro e mantém o bloqueio', () => {
  const recorded = call({ sessionId: 'sessao-a', mark: 'presente' });
  const first = describeStudentCheckIn({ discipline, current: recorded, now });
  const afterLogin = describeStudentCheckIn({ discipline, current: { ...recorded }, now });
  assert(first.kind === 'confirmed' && afterLogin.kind === 'confirmed', 'o estado vem do registro, não da memória');
  assert(afterLogin.actionsEnabled === false, 'o bloqueio continua depois do login');
});

run('chamada nova da mesma disciplina não herda a presença anterior', () => {
  const view = describeStudentCheckIn({
    discipline,
    current: call({ sessionId: 'sessao-b' }),
    previous: call({
      sessionId: 'sessao-a',
      status: 'encerrada',
      startsAt: '2026-11-16T12:00:00.000Z',
      mark: 'presente',
    }),
    now,
  });
  assert(view.kind === 'pending' && view.actionsEnabled, 'a sessão nova continua disponível');
  assert(view.message == null, 'a sessão nova não aparece como confirmada');
  assert(view.priorMessage?.includes('16 de novembro de 2026') === true, view.priorMessage ?? '');
});

run('presença de outro dia informa a data e não diz hoje', () => {
  const startsAt = '2026-11-10T14:00:00.000Z';
  const view = describeStudentCheckIn({
    discipline,
    current: call({ sessionId: 'sessao-antiga', status: 'encerrada', startsAt, mark: 'presente' }),
    now,
  });
  assert(view.actionsEnabled === false, 'chamada encerrada não recebe outro registro');
  assert(view.message === confirmedPresenceMessage(discipline, startsAt, now), 'a mensagem usa a data da aula');
  assert(view.message?.includes('hoje') === false, view.message ?? '');
  assert(isAcademicToday(startsAt, now) === false, '10 de novembro não é o dia acadêmico de 16 de novembro');
});

run('troca de conta não aproveita presença de outra sessão', () => {
  const view = describeStudentCheckIn({
    discipline,
    current: call({ sessionId: 'sessao-da-outra-conta' }),
    previous: null,
    now,
  });
  assert(view.kind === 'pending' && view.actionsEnabled, 'sem registro desta conta a chamada fica pendente');
});

run('consulta indefinida não libera confirmação', () => {
  const view = describeStudentCheckIn({
    discipline,
    current: call({ sessionId: 'sessao-a' }),
    now,
  });
  assert(canSubmitCheckIn(view.actionsEnabled, 'busy') === false, 'envio em andamento bloqueia outro envio');
  assert(canSubmitCheckIn(view.actionsEnabled, 'unverified') === false, 'falha de rede não libera novo registro');
});

run('código manual e QR Code consultam a mesma decisão', () => {
  const recorded = describeStudentCheckIn({
    discipline,
    current: call({ sessionId: 'sessao-a', mark: 'presente' }),
    now,
  });
  const manual = canSubmitCheckIn(recorded.actionsEnabled, 'idle');
  const camera = canSubmitCheckIn(recorded.actionsEnabled, 'idle');
  assert(manual === camera && manual === false, 'os dois fluxos bloqueiam a sessão já confirmada');
});

run('duplicidade é presença já registrada e não altera o original', () => {
  assert(interpretConfirmation('presente') === 'recorded', 'a primeira confirmação grava');
  assert(interpretConfirmation('duplicada') === 'recorded', 'a segunda tentativa reconhece o registro');
  assert(interpretConfirmation('codigo_invalido') === 'rejected', 'código inválido não vira presença');
  assert(interpretConfirmation('rede') === 'unverified', 'falha de rede não é tratada como sucesso');
  const original = call({ sessionId: 'sessao-a', mark: 'presente' });
  const again = describeStudentCheckIn({ discipline, current: original, now });
  assert(again.kind === 'confirmed' && original.mark === 'presente', 'o registro original permanece presente');
});

run('falta, código expirado e chamada encerrada bloqueiam o registro', () => {
  const absent = describeStudentCheckIn({
    discipline,
    current: call({ sessionId: 'sessao-a', mark: 'falta' }),
    now,
  });
  const expired = describeStudentCheckIn({
    discipline,
    current: call({ sessionId: 'sessao-a', codeExpiresAt: '2026-11-16T14:30:00.000Z' }),
    now,
  });
  const closed = describeStudentCheckIn({
    discipline,
    current: call({ sessionId: 'sessao-a', status: 'encerrada', mark: null }),
    now,
  });
  assert(absent.kind === 'absent' && absent.actionsEnabled === false, 'falta registrada não reabre a chamada');
  assert(expired.kind === 'expired' && expired.actionsEnabled === false, 'código vencido não libera a câmera');
  assert(closed.kind === 'closed' && closed.actionsEnabled === false, 'chamada encerrada não aceita presença');
});

run('o dia acadêmico não segue a data UTC', () => {
  const startsAt = '2026-11-16T02:30:00.000Z';
  const afternoon = new Date('2026-11-16T15:00:00.000Z');
  assert(isAcademicToday(startsAt, afternoon) === false, '02:30 UTC ainda é 15 de novembro em São Paulo');
  const message = confirmedPresenceMessage(discipline, startsAt, afternoon);
  assert(message.includes('15 de novembro de 2026'), message);
  assert(message.includes('hoje') === false, message);
});

console.log('10 verificações de presença passaram.');
