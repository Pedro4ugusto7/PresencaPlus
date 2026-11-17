BEGIN;

-- Confirmação pública por QR Code HTTPS.
-- O aluno não tem conta. A matrícula sozinha não prova quem está com o celular.
-- Não apaga chamadas nem presenças. Não altera as migrações já aplicadas.
-- anon continua sem INSERT em attendance_records.
-- Execute este arquivo uma única vez, depois da migração das turmas e do cadastro.



create extension if not exists pgcrypto with schema extensions;

alter table public.class_sessions
  add column check_in_token text,
  add column check_in_token_hash text;

alter table public.class_sessions
  add constraint class_sessions_check_in_token_format
  check (check_in_token is null or check_in_token ~ '^[0-9a-f]{64}$');

alter table public.class_sessions
  add constraint class_sessions_check_in_token_hash_format
  check (check_in_token_hash is null or check_in_token_hash ~ '^[0-9a-f]{64}$');

alter table public.class_sessions
  add constraint class_sessions_check_in_token_pair
  check (
    (check_in_token is null and check_in_token_hash is null)
    or (check_in_token is not null and check_in_token_hash is not null)
  );

create unique index class_sessions_check_in_token_hash_unique
  on public.class_sessions (check_in_token_hash)
  where check_in_token_hash is not null;

comment on column public.class_sessions.check_in_token is
  'Token imprevisível do QR público. Não entra no select da API. A matrícula do aluno não faz parte dele.';

comment on column public.class_sessions.check_in_token_hash is
  'SHA-256 hexadecimal do token. A confirmação pública procura a chamada por este hash.';

-- O select autenticado continua só nas colunas já concedidas.
-- Estas duas não são concedidas a anon nem a authenticated.
grant insert (check_in_token, check_in_token_hash)
  on table public.class_sessions to authenticated;
grant update (check_in_token, check_in_token_hash)
  on table public.class_sessions to authenticated;

create or replace function private.guard_check_in_token()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    new.check_in_token is distinct from old.check_in_token
    or new.check_in_token_hash is distinct from old.check_in_token_hash
  ) then
    if old.check_in_token is not null or old.check_in_token_hash is not null then
      raise exception 'o token da chamada não pode ser alterado';
    end if;
  end if;

  if new.check_in_token is null and new.check_in_token_hash is null then
    return new;
  end if;

  if new.check_in_token is null
    or new.check_in_token_hash is null
    or encode(extensions.digest(new.check_in_token, 'sha256'), 'hex') is distinct from new.check_in_token_hash
  then
    raise exception 'o token da chamada não confere';
  end if;

  return new;
end;
$$;

drop trigger if exists class_sessions_guard_check_in_token on public.class_sessions;
create trigger class_sessions_guard_check_in_token
before insert or update on public.class_sessions
for each row execute function private.guard_check_in_token();

-- Acrescenta o caminho da confirmação pública sem conta.
-- O caminho do aluno autenticado e o do encerramento permanecem.
create or replace function private.guard_attendance_record()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  class_professor uuid;
  session_status public.session_status;
  code_deadline timestamptz;
  class_ends timestamptz;
  enrolled boolean;
  applying text;
  checking text;
  closing text;
  public_check_in text;
begin
  select c.professor_id, s.status, s.code_expires_at, s.ends_at
  into class_professor, session_status, code_deadline, class_ends
  from public.class_sessions s
  join public.classes c on c.id = s.class_id
  where s.id = new.session_id;

  if class_professor is null then
    raise exception 'sessão de chamada inválida';
  end if;

  if tg_op = 'UPDATE' and (
    new.student_id is distinct from old.student_id
    or new.roster_student_id is distinct from old.roster_student_id
    or new.session_id is distinct from old.session_id
  ) then
    raise exception 'o aluno e a sessão do registro não podem ser trocados';
  end if;

  if new.recorded_by is not null and new.recorded_by is distinct from class_professor then
    raise exception 'somente o professor da turma registra a frequência';
  end if;

  select exists (
    select 1
    from public.enrollments e
    join public.class_sessions s on s.class_id = e.class_id
    where s.id = new.session_id
      and (
        (new.student_id is not null and e.student_id = new.student_id)
        or (new.roster_student_id is not null and e.roster_student_id = new.roster_student_id)
      )
  ) into enrolled;

  if not enrolled then
    raise exception 'o aluno não está matriculado nesta turma';
  end if;

  if auth.uid() is null and session_user = 'postgres' then
    return new;
  end if;

  public_check_in := nullif(pg_catalog.current_setting('presenca.public_check_in', true), '');

  if tg_op = 'INSERT' and public_check_in = new.session_id::text then
    if auth.uid() is not null then
      raise exception 'a confirmação pública não usa uma conta autenticada';
    end if;
    if new.student_id is not null or new.roster_student_id is null then
      raise exception 'a confirmação pública precisa do aluno sem conta';
    end if;
    if new.mark is distinct from 'presente' then
      raise exception 'a confirmação pública só registra presença';
    end if;
    if new.recorded_by is distinct from class_professor then
      raise exception 'somente o professor da turma registra a frequência';
    end if;
    if session_status is distinct from 'aberta' then
      raise exception 'não é possível registrar frequência em chamada encerrada';
    end if;
    if code_deadline is null or code_deadline < pg_catalog.now() then
      raise exception 'o código desta chamada não está mais válido';
    end if;
    if class_ends is not null and class_ends < pg_catalog.now() then
      raise exception 'a aula desta chamada já terminou';
    end if;
    return new;
  end if;

  checking := nullif(pg_catalog.current_setting('presenca.check_in', true), '');
  closing := nullif(pg_catalog.current_setting('presenca.session_close', true), '');

  if tg_op = 'INSERT' and checking = new.session_id::text then
    if auth.uid() is distinct from new.student_id or new.mark is distinct from 'presente' then
      raise exception 'a confirmação precisa ser do aluno autenticado';
    end if;
    if session_status is distinct from 'aberta' then
      raise exception 'não é possível registrar frequência em chamada encerrada';
    end if;
    if code_deadline is null or code_deadline < pg_catalog.now() then
      raise exception 'o código desta chamada não está mais válido';
    end if;
    if class_ends is not null and class_ends < pg_catalog.now() then
      raise exception 'a aula desta chamada já terminou';
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' and closing = new.session_id::text and auth.uid() = class_professor then
    if new.mark is distinct from 'falta' then
      raise exception 'o encerramento só completa faltas';
    end if;
    if session_status is distinct from 'aberta' then
      raise exception 'não é possível registrar frequência em chamada encerrada';
    end if;
    return new;
  end if;

  if auth.uid() is distinct from class_professor then
    raise exception 'somente o professor da turma registra a frequência';
  end if;

  applying := nullif(pg_catalog.current_setting('presenca.justification_apply', true), '');

  if tg_op = 'INSERT' then
    if session_status is distinct from 'aberta' then
      raise exception 'não é possível registrar frequência em chamada encerrada';
    end if;
    if code_deadline is null or code_deadline < pg_catalog.now() then
      raise exception 'o código desta chamada não está mais válido';
    end if;
    if class_ends is not null and class_ends < pg_catalog.now() then
      raise exception 'a aula desta chamada já terminou';
    end if;
    if new.mark = 'justificada' then
      raise exception 'a presença justificada nasce da avaliação da justificativa';
    end if;
    return new;
  end if;

  if applying = new.id::text then
    if not (
      (old.mark = 'falta' and new.mark = 'justificada')
      or (old.mark = 'justificada' and new.mark = 'falta')
    ) then
      raise exception 'a justificativa não pode alterar a frequência deste modo';
    end if;
    if new.recorded_by is distinct from old.recorded_by then
      raise exception 'a justificativa não pode alterar o vínculo da frequência';
    end if;
    return new;
  end if;

  if session_status is distinct from 'aberta' then
    raise exception 'a frequência de uma chamada encerrada não pode ser alterada';
  end if;
  if code_deadline is null or code_deadline < pg_catalog.now() then
    raise exception 'o código desta chamada não está mais válido';
  end if;
  if class_ends is not null and class_ends < pg_catalog.now() then
    raise exception 'a aula desta chamada já terminou';
  end if;
  if new.mark = 'justificada' then
    raise exception 'a presença justificada nasce da avaliação da justificativa';
  end if;
  if new.recorded_by is distinct from old.recorded_by then
    raise exception 'o autor do registro não pode ser trocado';
  end if;
  if exists (
    select 1
    from public.absence_justifications
    where attendance_record_id = new.id
      and status = 'aceita'
  ) and new.mark is distinct from old.mark then
    raise exception 'a frequência justificada segue a avaliação da justificativa';
  end if;

  return new;
end;
$$;

create or replace function public.session_check_in_token(target uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.check_in_token
  from public.class_sessions s
  join public.classes c on c.id = s.class_id
  where s.id = target
    and c.professor_id = auth.uid()
    and s.status = 'aberta'
    and s.code_expires_at is not null
    and s.code_expires_at >= pg_catalog.now()
$$;

revoke all on function public.session_check_in_token(uuid) from public, anon;
grant execute on function public.session_check_in_token(uuid) to authenticated;

create or replace function public.describe_public_check_in(token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  token_hash text;
  session_status public.session_status;
  deadline timestamptz;
  class_ends timestamptz;
  subject_name text;
  group_name text;
  period_label text;
begin
  if token is null or token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'result', 'invalido');
  end if;

  token_hash := encode(extensions.digest(token, 'sha256'), 'hex');

  select s.status, s.code_expires_at, s.ends_at, subject.name, academic_group.name, class_row.period
  into session_status, deadline, class_ends, subject_name, group_name, period_label
  from public.class_sessions s
  join public.classes class_row on class_row.id = s.class_id
  join public.subjects subject on subject.id = class_row.subject_id
  left join public.academic_groups academic_group on academic_group.id = class_row.academic_group_id
  where s.check_in_token_hash = token_hash;

  if not found then
    return jsonb_build_object('ok', false, 'result', 'invalido');
  end if;

  if session_status is distinct from 'aberta' then
    return jsonb_build_object(
      'ok', false,
      'result', 'encerrada',
      'subject', subject_name,
      'group', group_name,
      'period', period_label
    );
  end if;

  if deadline is null or deadline < pg_catalog.now()
    or (class_ends is not null and class_ends < pg_catalog.now())
  then
    return jsonb_build_object(
      'ok', false,
      'result', 'expirada',
      'subject', subject_name,
      'group', group_name,
      'period', period_label
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'result', 'aberta',
    'subject', subject_name,
    'group', group_name,
    'period', period_label,
    'expires_at', deadline
  );
end;
$$;

create or replace function public.confirm_public_attendance(token text, registration text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  token_hash text;
  trimmed text;
  v_session_id uuid;
  session_status public.session_status;
  deadline timestamptz;
  class_ends timestamptz;
  target_class uuid;
  class_professor uuid;
  subject_name text;
  roster_id uuid;
  student_name text;
begin
  if token is null or token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'result', 'invalido');
  end if;

  trimmed := btrim(coalesce(registration, ''));
  if char_length(trimmed) < 1 or char_length(trimmed) > 40 then
    return jsonb_build_object('ok', false, 'result', 'sem_matricula');
  end if;

  token_hash := encode(extensions.digest(token, 'sha256'), 'hex');

  select s.id, s.status, s.code_expires_at, s.ends_at, s.class_id, c.professor_id, subject.name
  into v_session_id, session_status, deadline, class_ends, target_class, class_professor, subject_name
  from public.class_sessions s
  join public.classes c on c.id = s.class_id
  join public.subjects subject on subject.id = c.subject_id
  where s.check_in_token_hash = token_hash
  for update of s;

  if not found then
    return jsonb_build_object('ok', false, 'result', 'invalido');
  end if;

  if session_status is distinct from 'aberta' then
    return jsonb_build_object('ok', false, 'result', 'encerrada', 'subject', subject_name);
  end if;

  if deadline is null or deadline < pg_catalog.now()
    or (class_ends is not null and class_ends < pg_catalog.now())
  then
    return jsonb_build_object('ok', false, 'result', 'expirada', 'subject', subject_name);
  end if;

  select student.id, student.full_name
  into roster_id, student_name
  from public.roster_students student
  join public.enrollments enrollment on enrollment.roster_student_id = student.id
  where student.professor_id = class_professor
    and student.registration_code = trimmed
    and enrollment.class_id = target_class;

  if not found then
    return jsonb_build_object('ok', false, 'result', 'sem_matricula');
  end if;

  if exists (
    select 1
    from public.attendance_records recorded
    where recorded.session_id = v_session_id
      and recorded.roster_student_id = roster_id
  ) then
    return jsonb_build_object(
      'ok', false,
      'result', 'duplicada',
      'name', student_name,
      'subject', subject_name
    );
  end if;

  perform set_config('presenca.public_check_in', v_session_id::text, true);
  insert into public.attendance_records (session_id, student_id, roster_student_id, mark, recorded_by)
  values (v_session_id, null, roster_id, 'presente', class_professor);
  perform set_config('presenca.public_check_in', '', true);

  return jsonb_build_object(
    'ok', true,
    'result', 'presente',
    'name', student_name,
    'subject', subject_name
  );
exception
  when unique_violation then
    perform set_config('presenca.public_check_in', '', true);
    return jsonb_build_object(
      'ok', false,
      'result', 'duplicada',
      'name', student_name,
      'subject', subject_name
    );
  when others then
    perform set_config('presenca.public_check_in', '', true);
    raise;
end;
$$;

revoke all on function public.describe_public_check_in(text) from public, anon, authenticated;
revoke all on function public.confirm_public_attendance(text, text) from public, anon, authenticated;
revoke all on function private.guard_check_in_token() from public, anon;

grant execute on function private.guard_check_in_token() to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.describe_public_check_in(text) to service_role;
    grant execute on function public.confirm_public_attendance(text, text) to service_role;
    revoke all on function public.session_check_in_token(uuid) from service_role;
  end if;
end $$;

comment on function public.confirm_public_attendance(text, text) is
  'Confirma a presença do aluno sem conta. Exige token da chamada e matrícula desta oferta. Não concede acesso de professor. A matrícula não prova a identidade física.';

commit;
