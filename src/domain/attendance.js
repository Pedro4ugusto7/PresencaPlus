/** Limite usual de frequência em cursos superiores no Brasil. */
export const MINIMUM_FREQUENCY = 75;
export function attendanceRate(present, total) {
  if (total <= 0) return 0;
  return Math.round(present / total * 100);
}
export function markCountsAsPresence(mark) {
  return mark === 'presente';
}
export function frequencyTone(percent) {
  if (percent >= 85) return 'good';
  if (percent >= MINIMUM_FREQUENCY) return 'warning';
  return 'critical';
}
export function formatPercent(value) {
  return `${Math.round(value)}%`;
}
export function formatSessionCode(code) {
  const digits = code.replace(/\s/g, '');
  if (digits.length !== 6) return code;
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}
export function countMarks(entries) {
  return entries.reduce((totals, entry) => {
    if (entry.mark === 'presente' || entry.mark === 'falta' || entry.mark === 'justificada') {
      totals[entry.mark] += 1;
    }
    return totals;
  }, {
    presente: 0,
    falta: 0,
    justificada: 0
  });
}
export function weightedAttendance(subjects) {
  const attended = subjects.reduce((sum, subject) => sum + subject.attended, 0);
  const total = subjects.reduce((sum, subject) => sum + subject.totalClasses, 0);
  return attendanceRate(attended, total);
}
export function markLabel(mark) {
  switch (mark) {
    case 'presente':
      return 'Presente';
    case 'falta':
      return 'Falta';
    case 'justificada':
      return 'Justificada';
  }
}
export function roleLabel(role) {
  return role === 'professor' ? 'Professor' : 'Aluno';
}
export function nextMark(mark) {
  if (mark === 'presente') return 'falta';
  if (mark === 'falta') return 'justificada';
  return 'presente';
}
