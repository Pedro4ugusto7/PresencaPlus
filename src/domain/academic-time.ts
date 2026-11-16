export const ACADEMIC_TIME_ZONE = 'America/Sao_Paulo';

function part(date: Date, type: Intl.DateTimeFormatPartTypes, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  return parts.find((item) => item.type === type)?.value ?? '';
}

export function academicDay(value: Date | string, timeZone = ACADEMIC_TIME_ZONE): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${part(date, 'year', timeZone)}-${part(date, 'month', timeZone)}-${part(date, 'day', timeZone)}`;
}

export function isAcademicToday(iso: string, now = new Date(), timeZone = ACADEMIC_TIME_ZONE): boolean {
  return academicDay(iso, timeZone) === academicDay(now, timeZone);
}

export function formatAcademicDate(iso: string, timeZone = ACADEMIC_TIME_ZONE): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}
