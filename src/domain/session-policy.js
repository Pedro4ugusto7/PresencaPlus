import { academicDay } from './academic-time';
export const CODE_VALID_MINUTES = 40;

export function checkInExpiresAt(start, minutes = CODE_VALID_MINUTES) {
  return new Date(start.getTime() + minutes * 60_000);
}
export const DAILY_CALL_MESSAGE = 'Já existe uma chamada registrada para esta turma hoje. Uma nova chamada poderá ser aberta no próximo dia.';
export function displayName(fullName, role) {
  const trimmed = fullName.trim();
  if (!trimmed) {
    const neutral = role === 'professor' ? 'Professor' : 'Aluno';
    return {
      name: neutral,
      firstName: neutral
    };
  }
  const firstName = trimmed.split(/\s+/)[0] || trimmed;
  return {
    name: trimmed,
    firstName
  };
}
export function classCalledOnAcademicDay(startsAt, day = new Date()) {
  const target = academicDay(day);
  return startsAt.some(iso => academicDay(iso) === target);
}
