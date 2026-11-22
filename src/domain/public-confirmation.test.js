import { readFileSync } from 'node:fs';
import { resolvePublicConfirmation } from './public-confirmation.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function run(name, check) {
  try {
    check();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'falhou';
    throw new Error(`${name}: ${message}`);
  }
}

run('chamada nova recusa matrícula e aceita o código individual', () => {
  const rejected = resolvePublicConfirmation({ mode: 'codigo', method: 'matricula' });
  const accepted = resolvePublicConfirmation({ mode: 'codigo', method: 'codigo' });
  assert(rejected.confirmed === false && rejected.result === 'codigo_obrigatorio', rejected.result);
  assert(accepted.confirmed === true && accepted.result === 'presente', accepted.result);
});

run('chamada antiga continua aceitando matrícula e não aceita código individual', () => {
  const accepted = resolvePublicConfirmation({ mode: 'matricula', method: 'matricula' });
  const missing = resolvePublicConfirmation({ mode: null, method: 'matricula' });
  const rejected = resolvePublicConfirmation({ mode: 'matricula', method: 'codigo' });
  assert(accepted.confirmed === true && missing.confirmed === true, 'compatibilidade');
  assert(rejected.confirmed === false && rejected.result === 'codigo_invalido', rejected.result);
});

run('chamada vencida que ainda aparece aberta não confirma por nenhum método', () => {
  const byCode = resolvePublicConfirmation({ mode: 'codigo', method: 'codigo', status: 'aberta', expired: true });
  const byRegistration = resolvePublicConfirmation({ mode: 'matricula', method: 'matricula', status: 'aberta', expired: true });
  assert(byCode.confirmed === false && byCode.result === 'expirada', byCode.result);
  assert(byRegistration.confirmed === false && byRegistration.result === 'expirada', byRegistration.result);
});

run('o banco recusa matrícula antes de gravar e preserva o padrão antigo', () => {
  const sql = readFileSync(new URL('../../supabase/migrations/20261121120000_individual_attendance_codes.sql', import.meta.url), 'utf8');
  const edge = readFileSync(new URL('../../supabase/functions/confirm-presence/index.js', import.meta.url), 'utf8');
  const registration = sql.slice(
    sql.indexOf('function public.confirm_public_attendance(token text, registration text)'),
    sql.indexOf('comment on function public.confirm_public_attendance')
  );
  const individual = sql.slice(
    sql.indexOf('function public.confirm_public_attendance_by_code'),
    sql.indexOf('function public.describe_public_check_in')
  );
  const codes = sql.slice(
    sql.indexOf('function public.ensure_session_attendance_codes'),
    sql.indexOf('function public.confirm_public_attendance_by_code')
  );
  assert(sql.includes("public_check_in_mode text not null default 'matricula'"), 'padrão antigo');
  assert(registration.indexOf('deadline < pg_catalog.now()') < registration.indexOf("session_mode = 'codigo'"), 'vencida antes da matrícula');
  assert(registration.indexOf("session_mode = 'codigo'") < registration.indexOf("set_config('presenca.public_check_in'"), 'recusa antes de gravar');
  assert(registration.includes('enrollment.withdrawn_at is null'), 'desmatrícula');
  assert(individual.indexOf('deadline < pg_catalog.now()') < individual.indexOf('codes.code_hash'), 'código vencido não é aceito');
  assert(individual.includes("session_mode is distinct from 'codigo'"), 'código não confirma chamada antiga');
  assert(codes.indexOf("session_mode is distinct from 'codigo'") < codes.indexOf('insert into private.session_attendance_codes'), 'não gera código na chamada antiga');
  assert(sql.includes("values ('individual_codes_required', false)"), 'corte começa desligado');
  assert(sql.includes('as chamadas novas exigem o código individual de presença'), 'corte recusa matrícula nova');
  assert(sql.includes('grant update on table private.app_settings') === false, 'professor não liga o corte');
  assert(sql.includes('grant execute on function private.individual_codes_required() to authenticated'), 'o gatilho consegue ler o corte');
  assert(sql.includes('grant insert (public_check_in_mode)'), 'abertura no modo novo');
  assert(sql.includes('grant update (public_check_in_mode') === false, 'modo não pode ser rebaixado');
  assert(sql.includes("(s.starts_at at time zone 'America/Sao_Paulo')::date"), 'vencidas de outro dia não são encerradas em massa');
  const codeCall = edge.indexOf("callRpc('confirm_public_attendance_by_code'");
  const registrationCall = edge.indexOf("callRpc('confirm_public_attendance',");
  assert(codeCall > 0 && registrationCall > codeCall, 'código é tentado antes da matrícula');
  assert(edge.slice(codeCall, registrationCall).includes('return reply'), 'falha do código não cai na matrícula');
  assert(edge.includes('codigo_obrigatorio'), 'mensagem da recusa');
  assert(sql.includes("check_in_blocked('token:") === false, 'o token compartilhado não tranca a turma');
  assert(individual.indexOf('codes.code_hash') < individual.indexOf('register_check_in_failure'), 'código certo não passa pelo limite');
  assert(registration.includes('register_check_in_failure') === false, 'matrícula não alimenta o bloqueio');
  assert(sql.includes('class_sessions_issue_codes'), 'códigos nascem na mesma transação da chamada');
  assert(sql.includes('não foi possível gerar os códigos individuais desta chamada'), 'falha na geração desfaz a abertura');
  assert(edge.includes('token:${token}') === false, 'a função pública não limita pelo QR compartilhado');
});
