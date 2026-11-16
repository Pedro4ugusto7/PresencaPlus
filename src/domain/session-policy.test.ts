import { academicDay } from './academic-time';
import { confirmedPresenceMessage } from './check-in-state';
import { classCalledOnAcademicDay, CODE_VALID_MINUTES, displayName } from './session-policy';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function run(name: string, check: () => void): void {
  try {
    check();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'falhou';
    throw new Error(`${name}: ${message}`);
  }
}

run('nome do professor e do aluno vem do perfil', () => {
  assert(displayName('Camila Andrade', 'professor').firstName === 'Camila', 'primeiro nome do professor');
  assert(displayName('Ana Beatriz', 'aluno').name === 'Ana Beatriz', 'nome completo do aluno');
});

run('perfil sem nome usa identificação neutra', () => {
  assert(displayName('   ', 'professor').name === 'Professor', 'professor sem nome');
  assert(displayName('', 'aluno').firstName === 'Aluno', 'aluno sem nome');
  assert(displayName('', 'aluno').name !== 'aluno@example.com', 'e-mail não substitui o nome');
});

run('validade padrão do código é de 10 minutos', () => {
  assert(CODE_VALID_MINUTES === 10, 'o prazo padrão deixou de ser 15 minutos');
});

run('uma turma só tem uma chamada no dia acadêmico', () => {
  const now = new Date('2026-11-16T15:00:00.000Z');
  const today = '2026-11-16T11:00:00.000Z';
  const closedEarlier = '2026-11-16T12:00:00.000Z';
  const tomorrow = '2026-11-17T11:00:00.000Z';
  const otherClass = '2026-11-16T18:00:00.000Z';
  assert(classCalledOnAcademicDay([today], now), 'a chamada de hoje bloqueia outra abertura');
  assert(classCalledOnAcademicDay([closedEarlier], now), 'chamada encerrada no dia continua bloqueando');
  assert(classCalledOnAcademicDay([tomorrow], now) === false, 'o dia seguinte libera a turma');
  assert(academicDay(otherClass) === academicDay(today), 'o fuso não separa a mesma turma');
  assert(classCalledOnAcademicDay([], now) === false, 'turma sem sessão pode abrir chamada');
});

run('virada do fuso não usa o dia UTC', () => {
  const startsAt = '2026-11-16T02:30:00.000Z';
  const afternoon = new Date('2026-11-16T15:00:00.000Z');
  assert(classCalledOnAcademicDay([startsAt], afternoon) === false, '02:30 UTC ainda é o dia anterior em São Paulo');
  assert(academicDay(startsAt) === '2026-11-15', academicDay(startsAt));
});

run('a mensagem usa o nome da disciplina da chamada', () => {
  const now = new Date('2026-11-16T15:00:00.000Z');
  const startsAt = '2026-11-16T14:00:00.000Z';
  const programming = confirmedPresenceMessage('Programação de Aplicativos', startsAt, now);
  const database = confirmedPresenceMessage('Banco de Dados', startsAt, now);
  assert(programming.includes('Programação de Aplicativos'), programming);
  assert(database.includes('Banco de Dados') && !database.includes('Programação de Aplicativos'), database);
});

console.log('6 verificações de chamada diária e nome passaram.');
