export const ACADEMIC_TIME_ZONE = 'America/Sao_Paulo';
function part(date, type, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  return parts.find(item => item.type === type)?.value ?? '';
}
export function academicDay(value, timeZone = ACADEMIC_TIME_ZONE) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${part(date, 'year', timeZone)}-${part(date, 'month', timeZone)}-${part(date, 'day', timeZone)}`;
}
export function isAcademicToday(iso, now = new Date(), timeZone = ACADEMIC_TIME_ZONE) {
  return academicDay(iso, timeZone) === academicDay(now, timeZone);
}
export function formatAcademicDate(iso, timeZone = ACADEMIC_TIME_ZONE) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(iso));
}
