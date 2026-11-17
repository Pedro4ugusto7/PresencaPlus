import { formatAcademicDate, isAcademicToday } from './academic-time';
export function confirmedPresenceMessage(discipline, startsAt, now = new Date()) {
  if (isAcademicToday(startsAt, now)) {
    return `Sua presença na disciplina ${discipline} foi confirmada hoje.`;
  }
  return `Sua presença na disciplina ${discipline} foi confirmada em ${formatAcademicDate(startsAt)}.`;
}
export function interpretConfirmation(result) {
  if (result === 'presente' || result === 'duplicada') return 'recorded';
  if (result === 'rede' || result === '') return 'unverified';
  return 'rejected';
}
export function canSubmitCheckIn(actionsEnabled, phase) {
  return actionsEnabled && phase === 'idle';
}
function priorMessage(previous, current) {
  if (!previous?.mark || previous.sessionId === current?.sessionId) return null;
  const date = formatAcademicDate(previous.startsAt);
  if (previous.mark === 'presente') return `Presença anterior confirmada em ${date}.`;
  if (previous.mark === 'falta') return `Falta anterior registrada em ${date}.`;
  return `Falta anterior justificada em ${date}.`;
}
function markedView(kind, discipline, current, previous, now) {
  const dateLabel = formatAcademicDate(current.startsAt);
  const message = kind === 'confirmed' ? confirmedPresenceMessage(discipline, current.startsAt, now) : kind === 'absent' ? `Sua falta na disciplina ${discipline} foi registrada em ${dateLabel}.` : `Sua falta na disciplina ${discipline} foi justificada em ${dateLabel}.`;
  return {
    kind,
    actionsEnabled: false,
    badge: kind === 'confirmed' ? 'Presença confirmada' : kind === 'absent' ? 'Falta registrada' : 'Falta justificada',
    badgeTone: kind === 'confirmed' ? 'present' : kind === 'absent' ? 'absent' : 'justified',
    message,
    dateLabel,
    priorMessage: priorMessage(previous, current)
  };
}
export function describeStudentCheckIn(input) {
  const now = input.now ?? new Date();
  const current = input.current;
  const previous = input.previous ?? null;
  if (!current) {
    return {
      kind: 'none',
      actionsEnabled: false,
      badge: null,
      badgeTone: 'neutral',
      message: 'Não há chamada aberta para esta disciplina.',
      dateLabel: null,
      priorMessage: priorMessage(previous, null)
    };
  }
  if (current.mark === 'presente') return markedView('confirmed', input.discipline, current, previous, now);
  if (current.mark === 'falta') return markedView('absent', input.discipline, current, previous, now);
  if (current.mark === 'justificada') return markedView('justified', input.discipline, current, previous, now);
  const prior = priorMessage(previous, current);
  const dateLabel = formatAcademicDate(current.startsAt);
  if (current.status === 'encerrada') {
    return {
      kind: 'closed',
      actionsEnabled: false,
      badge: 'Chamada encerrada',
      badgeTone: 'neutral',
      message: 'Esta chamada já foi encerrada.',
      dateLabel,
      priorMessage: prior
    };
  }
  const expired = current.codeExpiresAt != null && new Date(current.codeExpiresAt).getTime() <= now.getTime();
  if (expired) {
    return {
      kind: 'expired',
      actionsEnabled: false,
      badge: 'QR Code vencido',
      badgeTone: 'neutral',
      message: 'Este QR Code venceu. Peça ao professor para abrir uma nova chamada.',
      dateLabel,
      priorMessage: prior
    };
  }
  return {
    kind: 'pending',
    actionsEnabled: true,
    badge: 'Chamada aberta',
    badgeTone: 'accent',
    message: null,
    dateLabel,
    priorMessage: prior
  };
}
