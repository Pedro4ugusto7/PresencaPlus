export function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase('pt-BR');
}

export function matchesSearch(query: string, ...fields: string[]): boolean {
  const normalized = normalizeSearch(query);
  if (!normalized) return true;
  return fields.some((field) => normalizeSearch(field).includes(normalized));
}
