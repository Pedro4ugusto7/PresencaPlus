export function resolvePublicConfirmation({ mode, method, status = 'aberta', expired = false }) {
  if (status !== 'aberta') return { result: 'encerrada', confirmed: false };
  if (expired) return { result: 'expirada', confirmed: false };
  const individual = mode === 'codigo';
  if (individual && method === 'matricula') return { result: 'codigo_obrigatorio', confirmed: false };
  if (!individual && method === 'codigo') return { result: 'codigo_invalido', confirmed: false };
  if (method !== 'matricula' && method !== 'codigo') return { result: 'codigo_invalido', confirmed: false };
  return { result: 'presente', confirmed: true };
}
