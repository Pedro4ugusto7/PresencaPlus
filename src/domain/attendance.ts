import type { AttendanceEntry, AttendanceMark, FrequencyTone, StudentSubject } from '@/domain/types';

/** Limite usual de frequência em cursos superiores no Brasil. */
export const MINIMUM_FREQUENCY = 75;

export function attendanceRate(present: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((present / total) * 100);
}

export function frequencyTone(percent: number): FrequencyTone {
  if (percent >= 85) return 'good';
  if (percent >= MINIMUM_FREQUENCY) return 'warning';
  return 'critical';
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatSessionCode(code: string): string {
  const digits = code.replace(/\s/g, '');
  if (digits.length !== 6) return code;
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

export function countMarks(entries: AttendanceEntry[]): Record<AttendanceMark, number> {
  return entries.reduce<Record<AttendanceMark, number>>(
    (totals, entry) => {
      totals[entry.mark] += 1;
      return totals;
    },
    { presente: 0, falta: 0, justificada: 0 },
  );
}

export function weightedAttendance(subjects: StudentSubject[]): number {
  const attended = subjects.reduce((sum, subject) => sum + subject.attended, 0);
  const total = subjects.reduce((sum, subject) => sum + subject.totalClasses, 0);
  return attendanceRate(attended, total);
}

export function markLabel(mark: AttendanceMark): string {
  switch (mark) {
    case 'presente':
      return 'Presente';
    case 'falta':
      return 'Falta';
    case 'justificada':
      return 'Justificada';
  }
}

export function roleLabel(role: 'professor' | 'aluno'): string {
  return role === 'professor' ? 'Professor' : 'Aluno';
}

export function nextMark(mark: AttendanceMark): AttendanceMark {
  if (mark === 'presente') return 'falta';
  if (mark === 'falta') return 'justificada';
  return 'presente';
}
