import { academicDay } from './academic-time';
import type { UserRole } from './types';

export const CODE_VALID_MINUTES = 10;

export const DAILY_CALL_MESSAGE =
  'Já existe uma chamada registrada para esta turma hoje. Uma nova chamada poderá ser aberta no próximo dia.';

export function displayName(fullName: string, role: UserRole): { name: string; firstName: string } {
  const trimmed = fullName.trim();
  if (!trimmed) {
    const neutral = role === 'professor' ? 'Professor' : 'Aluno';
    return { name: neutral, firstName: neutral };
  }
  const firstName = trimmed.split(/\s+/)[0] || trimmed;
  return { name: trimmed, firstName };
}

export function classCalledOnAcademicDay(startsAt: readonly string[], day: Date | string = new Date()): boolean {
  const target = academicDay(day);
  return startsAt.some((iso) => academicDay(iso) === target);
}
