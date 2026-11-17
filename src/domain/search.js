export function normalizeSearch(value) {
  return value.trim().toLocaleLowerCase('pt-BR');
}
export function matchesSearch(query, ...fields) {
  const normalized = normalizeSearch(query);
  if (!normalized) return true;
  return fields.some(field => normalizeSearch(field).includes(normalized));
}
