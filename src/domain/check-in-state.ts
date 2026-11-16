import { formatAcademicDate, isAcademicToday } from './academic-time';
import type { StudentCallState } from './types';

export type CheckInKind = 'pending' | 'confirmed' | 'absent' | 'justified' | 'expired' | 'closed' | 'none';

export type CheckInView = {
  kind: CheckInKind;
  actionsEnabled: boolean;
  badge: string | null;
  badgeTone: 'present' | 'absent' | 'justified' | 'accent' | 'neutral';
  message: string | null;
  dateLabel: string | null;
  priorMessage: string | null;
};

export function confirmedPresenceMessage(discipline: string, startsAt: string, now = new Date()): string {
  if (isAcademicToday(startsAt, now)) {
    return `Sua presença na disciplina ${discipline} foi confirmada hoje.`;
  }
  return `Sua presença na disciplina ${discipline} foi confirmada em ${formatAcademicDate(startsAt)}.`;
}

export function interpretConfirmation(result: string): 'recorded' | 'rejected' | 'unverified' {
  if (result === 'presente' || result === 'duplicada') return 'recorded';
  if (result === 'rede' || result === '') return 'unverified';
  return 'rejected';
}

export function canSubmitCheckIn(actionsEnabled: boolean, phase: 'idle' | 'busy' | 'unverified'): boolean {
  return actionsEnabled && phase === 'idle';
}

function priorMessage(previous: StudentCallState | null, current: StudentCallState | null): string | null {
  if (!previous?.mark || previous.sessionId === current?.sessionId) return null;
  const date = formatAcademicDate(previous.startsAt);
  if (previous.mark === 'presente') return `Presença anterior confirmada em ${date}.`;
  if (previous.mark === 'falta') return `Falta anterior registrada em ${date}.`;
  return `Falta anterior justificada em ${date}.`;
}

function markedView(
  kind: 'confirmed' | 'absent' | 'justified',
  discipline: string,
  current: StudentCallState,
  previous: StudentCallState | null,
  now: Date,
): CheckInView {
  const dateLabel = formatAcademicDate(current.startsAt);
  const message =
    kind === 'confirmed'
      ? confirmedPresenceMessage(discipline, current.startsAt, now)
      : kind === 'absent'
        ? `Sua falta na disciplina ${discipline} foi registrada em ${dateLabel}.`
        : `Sua falta na disciplina ${discipline} foi justificada em ${dateLabel}.`;
  return {
    kind,
    actionsEnabled: false,
    badge: kind === 'confirmed' ? 'Presença confirmada' : kind === 'absent' ? 'Falta registrada' : 'Falta justificada',
    badgeTone: kind === 'confirmed' ? 'present' : kind === 'absent' ? 'absent' : 'justified',
    message,
    dateLabel,
    priorMessage: priorMessage(previous, current),
  };
}

export function describeStudentCheckIn(input: {
  discipline: string;
  current: StudentCallState | null;
  previous?: StudentCallState | null;
  now?: Date;
}): CheckInView {
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
      priorMessage: priorMessage(previous, null),
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
      priorMessage: prior,
    };
  }

  const expired = current.codeExpiresAt != null && new Date(current.codeExpiresAt).getTime() <= now.getTime();
  if (expired) {
    return {
      kind: 'expired',
      actionsEnabled: false,
      badge: 'Código expirado',
      badgeTone: 'neutral',
      message: 'O código desta chamada não está mais válido.',
      dateLabel,
      priorMessage: prior,
    };
  }

  return {
    kind: 'pending',
    actionsEnabled: true,
    badge: 'Chamada aberta',
    badgeTone: 'accent',
    message: null,
    dateLabel,
    priorMessage: prior,
  };
}
