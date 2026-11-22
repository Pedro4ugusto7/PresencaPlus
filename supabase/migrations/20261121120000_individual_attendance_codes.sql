-- Códigos individuais de presença, desmatrícula rastreável, edição da oferta
-- e justificativa registrada pelo professor.
-- Não apaga presenças antigas e não reabre chamada.
-- Chamadas já existentes permanecem no modo matrícula.
-- Só a chamada marcada como codigo recusa matrícula, dentro do banco.
-- Execute uma única vez, depois das migrações anteriores. Não rode no remoto
-- sem autorização.

begin;

alter table public.enrollments
  add column withdrawn_at timestamptz;

comment on column public.enrollments.withdrawn_at is
  'Preenchido na desmatrícula. A linha e as presenças anteriores permanecem.';

alter table public.class_sessions
  add column public_check_in_mode text not null default 'matricula';

alter table public.class_sessions
  add constraint class_sessions_public_check_in_mode
  check (public_check_in_mode in ('matricula', 'codigo'));

comment on column public.class_sessions.public_check_in_mode is
  'matricula conserva a confirmação já publicada. codigo exige o código individual e a matrícula é recusada no banco.';

alter table public.absence_justifications
  alter column student_id drop not null,
  alter column reason drop not null;

alter table public.absence_justifications
  add column roster_student_id uuid references public.roster_students (id) on delete restrict;

alter table public.absence_justifications
  drop constraint absence_justifications_reason_length;

alter table public.absence_justifications
  add constraint absence_justifications_reason_length
  check (reason is null or char_length(btrim(reason)) between 1 and 1000);

alter table public.absence_justifications
  add constraint absence_justifications_person
  check (
    (student_id is not null and roster_student_id is null)
    or (student_id is null and roster_student_id is not null)
  );

create table private.session_attendance_codes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions (id) on delete cascade,
  student_id uuid references public.profiles (id) on delete restrict,
  roster_student_id uuid references public.roster_students (id) on delete restrict,
  code_hash text not null,
  code_text text not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  constraint session_attendance_codes_person check (
    (student_id is not null and roster_student_id is null)
    or (student_id is null and roster_student_id is not null)
  ),
  constraint session_attendance_codes_hash_format check (code_hash ~ '^[0-9a-f]{64}$'),
  constraint session_attendance_codes_text_format check (
    code_text = '' or code_text ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$'
  )
);

create unique index session_attendance_codes_hash_unique
  on private.session_attendance_codes (code_hash);

create unique index session_attendance_codes_student_unique
  on private.session_attendance_codes (session_id, student_id)
  where student_id is not null;

create unique index session_attendance_codes_roster_unique
  on private.session_attendance_codes (session_id, roster_student_id)
  where roster_student_id is not null;

create index session_attendance_codes_session_idx
  on private.session_attendance_codes (session_id);

alter table private.session_attendance_codes enable row level security;

revoke all on table private.session_attendance_codes from public, anon, authenticated;

create table private.check_in_failures (
  bucket text primary key,
  failures integer not null,
  window_started timestamptz not null
);

alter table private.check_in_failures enable row level security;

revoke all on table private.check_in_failures from public, anon, authenticated;

create table private.app_settings (
  key text primary key,
  enabled boolean not null
);

insert into private.app_settings (key, enabled)
values ('individual_codes_required', false);

alter table private.app_settings enable row level security;

revoke all on table private.app_settings from public, anon, authenticated;

comment on table private.app_settings is
  'individual_codes_required começa desligado para não interromper o site publicado. Depois da página nova, o administrador liga esta chave no SQL Editor. Ela não apaga chamadas antigas.';

create or replace function private.individual_codes_required()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select enabled
    from private.app_settings
    where key = 'individual_codes_required'
  ), false);
$$;

revoke all on function private.individual_codes_required() from public, anon, authenticated;
grant execute on function private.individual_codes_required() to authenticated;

comment on table private.session_attendance_codes is
  'Códigos individuais. A API pública não lê esta tabela. O texto só sai pela função do professor enquanto a chamada está aberta.';

create or replace function private.random_attendance_code()
returns text
language plpgsql
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  raw bytea := extensions.gen_random_bytes(10);
  index integer := 0;
  result text := '';
begin
  while index < 10 loop
    result := result || substr(alphabet, (get_byte(raw, index) % 32) + 1, 1);
    index := index + 1;
  end loop;
  return result;
end;
$$;

-- O bloqueio é só da origem que errou. O token do QR é compartilhado pela turma
-- e não entra na conta: um código certo continua valendo mesmo depois dos erros.
create or replace function private.check_in_blocked(target_bucket text)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  current_failures integer;
  started timestamptz;
begin
  if target_bucket is null or target_bucket not like 'ip:%' then
    return false;
  end if;

  select failures, window_started into current_failures, started
  from private.check_in_failures
  where private.check_in_failures.bucket = target_bucket;
  if not found then
    return false;
  end if;
  return started >= pg_catalog.now() - interval '10 minutes' and current_failures >= 30;
end;
$$;

create or replace function private.register_check_in_failure(target_bucket text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  insert into private.check_in_failures as current (bucket, failures, window_started)
  values (target_bucket, 1, pg_catalog.now())
  on conflict (bucket) do update
  set failures = case
        when current.window_started < pg_catalog.now() - interval '10 minutes' then 1
        else current.failures + 1
      end,
      window_started = case
        when current.window_started < pg_catalog.now() - interval '10 minutes' then pg_catalog.now()
        else current.window_started
      end;
end;
$$;

create or replace function private.revoke_session_codes(target_session uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.session_attendance_codes
  set code_text = '',
      revoked_at = coalesce(revoked_at, pg_catalog.now())
  where session_id = target_session
    and used_at is null;

  update private.session_attendance_codes
  set code_text = ''
  where session_id = target_session
    and used_at is not null;
end;
$$;

create or replace function private.guard_class_session()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null and session_user = 'postgres' then
    return new;
  end if;

  if not exists (
    select 1
    from public.classes
    where id = new.class_id
      and professor_id = auth.uid()
  ) then
    raise exception 'somente o professor da turma opera a chamada';
  end if;

  if tg_op = 'INSERT' or new.status = 'aberta' then
    if new.code_expires_at is null then
      raise exception 'a chamada aberta precisa de validade para o código';
    end if;
    if new.code_expires_at <= new.starts_at
      or new.code_expires_at > new.starts_at + interval '40 minutes'
    then
      raise exception 'a validade do código excede o período permitido';
    end if;
    if new.ends_at is not null and (
      new.ends_at <= new.starts_at
      or new.ends_at > new.starts_at + interval '4 hours'
      or new.code_expires_at > new.ends_at
    ) then
      raise exception 'a duração da aula excede o período permitido';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if new.status is distinct from 'aberta' then
      raise exception 'a chamada começa aberta';
    end if;
    if new.code is null or new.code !~ '^[0-9]{6}$' then
      raise exception 'a chamada aberta precisa de um código de 6 dígitos';
    end if;
    if new.starts_at > pg_catalog.now() + interval '15 minutes' then
      raise exception 'o início da chamada não pode estar no futuro';
    end if;
    if new.starts_at < pg_catalog.now() - interval '12 hours' then
      raise exception 'o início da chamada está fora do período permitido';
    end if;
    if new.code_expires_at <= pg_catalog.now() then
      raise exception 'a validade do código já expirou';
    end if;
    if new.public_check_in_mode is distinct from 'matricula'
      and new.public_check_in_mode is distinct from 'codigo'
    then
      raise exception 'modo de confirmação inválido';
    end if;
    if private.individual_codes_required()
      and new.public_check_in_mode is distinct from 'codigo'
    then
      raise exception 'as chamadas novas exigem o código individual de presença';
    end if;
    return new;
  end if;

  if new.public_check_in_mode is distinct from old.public_check_in_mode then
    raise exception 'o modo de confirmação da chamada não pode ser alterado';
  end if;

  if new.class_id is distinct from old.class_id then
    raise exception 'a chamada não pode mudar de turma';
  end if;
  if new.starts_at is distinct from old.starts_at then
    raise exception 'o início da chamada não pode ser alterado';
  end if;

  if old.status = 'encerrada' then
    if new.status is distinct from 'encerrada'
      or new.ends_at is distinct from old.ends_at
      or new.code_expires_at is distinct from old.code_expires_at
      or new.code is distinct from old.code
    then
      raise exception 'a chamada encerrada não pode ser reaberta nem alterada';
    end if;
    return new;
  end if;

  if new.status = 'aberta' then
    if new.code is distinct from old.code then
      raise exception 'o código da chamada não pode ser adulterado';
    end if;
    return new;
  end if;

  if new.status = 'encerrada' then
    if new.ends_at is null or new.ends_at <= new.starts_at then
      raise exception 'encerre a chamada com um horário de término válido';
    end if;
    if new.ends_at > new.starts_at + interval '4 hours' then
      raise exception 'a duração da aula excede o período permitido';
    end if;
    if new.ends_at > pg_catalog.now() + interval '5 minutes' then
      raise exception 'o encerramento não pode ficar no futuro';
    end if;
    if new.code_expires_at is distinct from old.code_expires_at then
      raise exception 'a validade do código não pode ser alterada no encerramento';
    end if;
    if new.code is not null and new.code is distinct from old.code then
      raise exception 'o código da chamada não pode ser adulterado';
    end if;
    if exists (
      select 1
      from public.enrollments enrolled_student
      where enrolled_student.class_id = new.class_id
        and enrolled_student.withdrawn_at is null
        and not exists (
          select 1
          from public.attendance_records recorded
          where recorded.session_id = new.id
            and (
              (enrolled_student.student_id is not null and recorded.student_id = enrolled_student.student_id)
              or (enrolled_student.roster_student_id is not null and recorded.roster_student_id = enrolled_student.roster_student_id)
            )
        )
    ) then
      raise exception 'encerre a chamada somente depois de registrar quem não confirmou';
    end if;
    return new;
  end if;

  raise exception 'transição de chamada inválida';
end;
$$;

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
  public_code text;
  check_mode text;
begin
  select c.professor_id, s.status, s.code_expires_at, s.ends_at, s.public_check_in_mode
  into class_professor, session_status, code_deadline, class_ends, check_mode
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
      and (tg_op = 'UPDATE' or e.withdrawn_at is null)
  ) into enrolled;

  if not enrolled then
    raise exception 'o aluno não está matriculado nesta turma';
  end if;

  if auth.uid() is null and session_user = 'postgres' then
    return new;
  end if;

  public_check_in := nullif(pg_catalog.current_setting('presenca.public_check_in', true), '');
  public_code := nullif(pg_catalog.current_setting('presenca.public_code', true), '');

  if tg_op = 'INSERT' and public_code = new.session_id::text then
    if auth.uid() is not null then
      raise exception 'a confirmação pública não usa uma conta autenticada';
    end if;
    if new.mark is distinct from 'presente' then
      raise exception 'a confirmação pública só registra presença';
    end if;
    if new.recorded_by is distinct from class_professor then
      raise exception 'somente o professor da turma registra a frequência';
    end if;
    if (new.student_id is null) = (new.roster_student_id is null) then
      raise exception 'a confirmação pública precisa de um aluno da chamada';
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
    if check_mode is distinct from 'codigo' then
      raise exception 'esta chamada não aceita o código individual';
    end if;
    return new;
  end if;

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
    if check_mode = 'codigo' then
      raise exception 'esta chamada só aceita o código individual';
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

create or replace function private.guard_justification()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  owner uuid;
  roster_owner uuid;
  current_mark public.attendance_mark;
  professor_flag text;
  class_professor uuid;
begin
  select student_id, roster_student_id, mark
  into owner, roster_owner, current_mark
  from public.attendance_records
  where id = new.attendance_record_id;

  if owner is null and roster_owner is null then
    raise exception 'a justificativa não pertence a este aluno';
  end if;
  if new.student_id is distinct from owner or new.roster_student_id is distinct from roster_owner then
    raise exception 'a justificativa não pertence a este aluno';
  end if;

  if tg_op = 'UPDATE' and (
    new.student_id is distinct from old.student_id
    or new.roster_student_id is distinct from old.roster_student_id
    or new.attendance_record_id is distinct from old.attendance_record_id
  ) then
    raise exception 'o vínculo da justificativa não pode ser trocado';
  end if;

  professor_flag := nullif(pg_catalog.current_setting('presenca.professor_justification', true), '');
  if tg_op = 'INSERT' and professor_flag = new.attendance_record_id::text then
    select class_row.professor_id into class_professor
    from public.attendance_records recorded
    join public.class_sessions session_row on session_row.id = recorded.session_id
    join public.classes class_row on class_row.id = session_row.class_id
    where recorded.id = new.attendance_record_id;
    if auth.uid() is distinct from class_professor then
      raise exception 'somente o professor da turma justifica a falta';
    end if;
    if current_mark is distinct from 'falta' or new.status is distinct from 'aceita' then
      raise exception 'somente uma falta pode ser justificada';
    end if;
    return new;
  end if;

  if auth.uid() is not null and tg_op = 'INSERT' and auth.uid() is distinct from new.student_id then
    raise exception 'a justificativa precisa ser do próprio aluno';
  end if;

  if tg_op = 'INSERT' and (new.status is distinct from 'pendente' or current_mark is distinct from 'falta') then
    raise exception 'somente uma falta pode receber justificativa pendente';
  end if;

  if auth.uid() is not null and tg_op = 'UPDATE' and new.status is distinct from old.status then
    if not (
      (old.status = 'pendente' and new.status in ('aceita', 'recusada'))
      or (old.status = 'aceita' and new.status = 'recusada')
      or (old.status = 'recusada' and new.status = 'aceita')
    ) then
      raise exception 'transição de justificativa inválida';
    end if;
    if not exists (
      select 1
      from public.attendance_records recorded
      join public.class_sessions session_row on session_row.id = recorded.session_id
      join public.classes class_row on class_row.id = session_row.class_id
      where recorded.id = new.attendance_record_id
        and class_row.professor_id = auth.uid()
    ) then
      raise exception 'somente o professor da turma avalia a justificativa';
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.apply_accepted_justification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.status = 'aceita' then
    perform set_config('presenca.justification_apply', new.attendance_record_id::text, true);
    update public.attendance_records
    set mark = 'justificada', updated_at = pg_catalog.now()
    where id = new.attendance_record_id
      and mark = 'falta';
    if not found then
      raise exception 'somente uma falta pode ser justificada';
    end if;
    perform set_config('presenca.justification_apply', '', true);
    return new;
  end if;

  if tg_op = 'UPDATE' and new.status = 'aceita' and old.status is distinct from 'aceita' then
    perform set_config('presenca.justification_apply', new.attendance_record_id::text, true);
    update public.attendance_records
    set mark = 'justificada', updated_at = pg_catalog.now()
    where id = new.attendance_record_id
      and mark = 'falta';
    if not found then
      raise exception 'somente uma falta pode ser justificada';
    end if;
    perform set_config('presenca.justification_apply', '', true);
  elsif tg_op = 'UPDATE' and old.status = 'aceita' and new.status = 'recusada' then
    perform set_config('presenca.justification_apply', new.attendance_record_id::text, true);
    update public.attendance_records
    set mark = 'falta', updated_at = pg_catalog.now()
    where id = new.attendance_record_id
      and mark = 'justificada';
    if not found then
      raise exception 'a remoção não conseguiu restaurar a falta';
    end if;
    perform set_config('presenca.justification_apply', '', true);
  end if;
  return new;
end;
$$;

drop trigger if exists absence_justifications_apply on public.absence_justifications;
create trigger absence_justifications_apply
after insert or update on public.absence_justifications
for each row execute function private.apply_accepted_justification();

create or replace function private.finish_open_session(target_session uuid, teacher uuid, started timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  finished timestamptz;
  target_class uuid;
begin
  select class_id into target_class
  from public.class_sessions
  where id = target_session;

  finished := least(pg_catalog.now(), started + interval '4 hours');
  if finished <= started then
    finished := started + interval '1 second';
  end if;

  perform set_config('presenca.session_close', target_session::text, true);
  insert into public.attendance_records (session_id, student_id, roster_student_id, mark, recorded_by)
  select target_session, e.student_id, e.roster_student_id, 'falta', teacher
  from public.enrollments e
  where e.class_id = target_class
    and e.withdrawn_at is null
    and not exists (
      select 1
      from public.attendance_records recorded
      where recorded.session_id = target_session
        and (
          (e.student_id is not null and recorded.student_id = e.student_id)
          or (e.roster_student_id is not null and recorded.roster_student_id = e.roster_student_id)
        )
    );
  perform set_config('presenca.session_close', '', true);
  perform private.revoke_session_codes(target_session);

  update public.class_sessions
  set status = 'encerrada',
      ends_at = finished,
      code = null
  where id = target_session
    and status = 'aberta';
exception
  when others then
    perform set_config('presenca.session_close', '', true);
    raise;
end;
$$;

create or replace function public.close_class_session(target_session uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  teacher uuid := auth.uid();
  teacher_role public.user_role;
  session_status public.session_status;
  started timestamptz;
  present_count integer;
  absent_count integer;
begin
  if teacher is null then
    return jsonb_build_object('ok', false, 'result', 'autenticacao');
  end if;

  select role into teacher_role
  from public.profiles
  where id = teacher;

  if teacher_role is distinct from 'professor' then
    return jsonb_build_object('ok', false, 'result', 'papel');
  end if;

  select s.status, s.starts_at
  into session_status, started
  from public.class_sessions s
  join public.classes c on c.id = s.class_id
  where s.id = target_session
    and c.professor_id = teacher
  for update of s;

  if not found then
    return jsonb_build_object('ok', false, 'result', 'indisponivel');
  end if;

  if session_status is distinct from 'aberta' then
    return jsonb_build_object('ok', false, 'result', 'encerrada');
  end if;

  if started > pg_catalog.now() then
    if started >= pg_catalog.now() + interval '5 minutes' then
      return jsonb_build_object('ok', false, 'result', 'horario_invalido');
    end if;
    return jsonb_build_object('ok', false, 'result', 'futura');
  end if;

  perform private.finish_open_session(target_session, teacher, started);

  select
    count(*) filter (where mark = 'presente'),
    count(*) filter (where mark = 'falta')
  into present_count, absent_count
  from public.attendance_records
  where session_id = target_session;

  return jsonb_build_object(
    'ok', true,
    'result', 'encerrada',
    'present', present_count,
    'absent', absent_count
  );
exception
  when others then
    perform set_config('presenca.session_close', '', true);
    raise;
end;
$$;

create or replace function public.settle_expired_calls()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  teacher uuid := auth.uid();
  teacher_role public.user_role;
  session_row record;
  settled integer := 0;
begin
  if teacher is null then
    return jsonb_build_object('ok', false, 'result', 'autenticacao');
  end if;

  select role into teacher_role
  from public.profiles
  where id = teacher;

  if teacher_role is distinct from 'professor' then
    return jsonb_build_object('ok', false, 'settled', 0);
  end if;

  for session_row in
    select s.id, s.starts_at
    from public.class_sessions s
    join public.classes c on c.id = s.class_id
    where c.professor_id = teacher
      and s.status = 'aberta'
      and s.code_expires_at < pg_catalog.now()
      and (s.starts_at at time zone 'America/Sao_Paulo')::date
        = (pg_catalog.now() at time zone 'America/Sao_Paulo')::date
    for update of s
  loop
    perform private.finish_open_session(session_row.id, teacher, session_row.starts_at);
    settled := settled + 1;
  end loop;

  return jsonb_build_object('ok', true, 'settled', settled);
exception
  when others then
    perform set_config('presenca.session_close', '', true);
    raise;
end;
$$;

create or replace function public.ensure_session_attendance_codes(target_session uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  teacher uuid := auth.uid();
  session_status public.session_status;
  deadline timestamptz;
  target_class uuid;
  session_mode text;
  enrollment record;
  existing_id uuid;
  existing_used timestamptz;
  existing_revoked timestamptz;
  raw text;
  hash text;
  attempt integer;
  stored boolean;
begin
  if teacher is null then
    return jsonb_build_object('ok', false, 'result', 'autenticacao', 'codes', '[]'::jsonb);
  end if;

  select s.status, s.code_expires_at, s.class_id, s.public_check_in_mode
  into session_status, deadline, target_class, session_mode
  from public.class_sessions s
  join public.classes c on c.id = s.class_id
  where s.id = target_session
    and c.professor_id = teacher
  for update of s;

  if not found then
    return jsonb_build_object('ok', false, 'result', 'indisponivel', 'mode', null, 'codes', '[]'::jsonb);
  end if;

  if session_mode is distinct from 'codigo' then
    return jsonb_build_object('ok', true, 'mode', 'matricula', 'codes', '[]'::jsonb);
  end if;

  if session_status is distinct from 'aberta'
    or deadline is null
    or deadline < pg_catalog.now()
  then
    perform private.revoke_session_codes(target_session);
    return jsonb_build_object('ok', true, 'mode', 'codigo', 'codes', '[]'::jsonb);
  end if;

  for enrollment in
    select e.student_id, e.roster_student_id
    from public.enrollments e
    where e.class_id = target_class
      and e.withdrawn_at is null
  loop
    existing_id := null;
    existing_used := null;
    existing_revoked := null;
    select codes.id, codes.used_at, codes.revoked_at
    into existing_id, existing_used, existing_revoked
    from private.session_attendance_codes codes
    where codes.session_id = target_session
      and codes.student_id is not distinct from enrollment.student_id
      and codes.roster_student_id is not distinct from enrollment.roster_student_id
    for update;

    if existing_used is not null then
      continue;
    end if;
    if existing_id is not null and existing_revoked is null then
      continue;
    end if;

    stored := false;
    attempt := 0;
    while stored = false and attempt < 8 loop
      attempt := attempt + 1;
      raw := private.random_attendance_code();
      hash := encode(extensions.digest(raw, 'sha256'), 'hex');
      begin
        if existing_id is null then
          insert into private.session_attendance_codes (
            session_id, student_id, roster_student_id, code_hash, code_text
          ) values (
            target_session, enrollment.student_id, enrollment.roster_student_id, hash, raw
          );
        else
          update private.session_attendance_codes
          set code_hash = hash,
              code_text = raw,
              revoked_at = null
          where id = existing_id;
        end if;
        stored := true;
      exception
        when unique_violation then
          stored := false;
      end;
    end loop;
    if stored = false then
      raise exception 'não foi possível gerar o código individual';
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'mode', 'codigo',
    'codes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'student_id', codes.student_id,
        'roster_student_id', codes.roster_student_id,
        'code', codes.code_text,
        'used', codes.used_at is not null
      ))
      from private.session_attendance_codes codes
      where codes.session_id = target_session
        and codes.revoked_at is null
        and codes.code_text <> ''
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function private.issue_codes_for_new_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  issued jsonb;
begin
  if new.public_check_in_mode is distinct from 'codigo' then
    return new;
  end if;
  if auth.uid() is null and session_user = 'postgres' then
    return new;
  end if;

  issued := public.ensure_session_attendance_codes(new.id);
  if coalesce(issued->>'ok', 'false') is distinct from 'true'
    or issued->>'mode' is distinct from 'codigo'
  then
    raise exception 'não foi possível gerar os códigos individuais desta chamada';
  end if;
  return new;
end;
$$;

drop trigger if exists class_sessions_issue_codes on public.class_sessions;
create trigger class_sessions_issue_codes
after insert on public.class_sessions
for each row execute function private.issue_codes_for_new_session();

create or replace function public.confirm_public_attendance_by_code(
  token text,
  attendance_code text,
  client_ip text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  token_hash text;
  normalized text;
  submitted_hash text;
  address text;
  v_session_id uuid;
  session_status public.session_status;
  deadline timestamptz;
  class_ends timestamptz;
  target_class uuid;
  class_professor uuid;
  subject_name text;
  session_mode text;
  code_row private.session_attendance_codes%rowtype;
  student_name text;
  active_enrollment boolean;
  source text;
begin
  if token is null or token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'result', 'invalido');
  end if;

  normalized := upper(regexp_replace(coalesce(attendance_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if normalized !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$' then
    return jsonb_build_object('ok', false, 'result', 'codigo_invalido');
  end if;

  token_hash := encode(extensions.digest(token, 'sha256'), 'hex');
  submitted_hash := encode(extensions.digest(normalized, 'sha256'), 'hex');
  address := nullif(left(btrim(coalesce(client_ip, '')), 80), '');
  source := 'ip:' || coalesce(address, 'sem-endereco');

  select s.id, s.status, s.code_expires_at, s.ends_at, s.class_id, s.public_check_in_mode, c.professor_id, subject.name
  into v_session_id, session_status, deadline, class_ends, target_class, session_mode, class_professor, subject_name
  from public.class_sessions s
  join public.classes c on c.id = s.class_id
  join public.subjects subject on subject.id = c.subject_id
  where s.check_in_token_hash = token_hash
  for update of s;

  if not found then
    return jsonb_build_object('ok', false, 'result', 'invalido');
  end if;

  if session_status is distinct from 'aberta' then
    perform private.revoke_session_codes(v_session_id);
    return jsonb_build_object('ok', false, 'result', 'encerrada', 'subject', subject_name);
  end if;

  if deadline is null or deadline < pg_catalog.now()
    or (class_ends is not null and class_ends < pg_catalog.now())
  then
    perform private.revoke_session_codes(v_session_id);
    return jsonb_build_object('ok', false, 'result', 'expirada', 'subject', subject_name);
  end if;

  if session_mode is distinct from 'codigo' then
    return jsonb_build_object('ok', false, 'result', 'codigo_invalido', 'subject', subject_name);
  end if;

  select codes.*
  into code_row
  from private.session_attendance_codes codes
  where codes.session_id = v_session_id
    and codes.code_hash = submitted_hash
  for update;

  if not found then
    if private.check_in_blocked(source) then
      return jsonb_build_object('ok', false, 'result', 'limite');
    end if;
    perform private.register_check_in_failure(source);
    return jsonb_build_object('ok', false, 'result', 'codigo_invalido');
  end if;

  if code_row.roster_student_id is not null then
    select student.full_name into student_name
    from public.roster_students student
    where student.id = code_row.roster_student_id;
  else
    select profile.full_name into student_name
    from public.profiles profile
    where profile.id = code_row.student_id;
  end if;

  select exists (
    select 1
    from public.enrollments enrollment
    where enrollment.class_id = target_class
      and enrollment.withdrawn_at is null
      and enrollment.student_id is not distinct from code_row.student_id
      and enrollment.roster_student_id is not distinct from code_row.roster_student_id
  ) into active_enrollment;

  if code_row.revoked_at is not null or active_enrollment = false then
    if private.check_in_blocked(source) then
      return jsonb_build_object('ok', false, 'result', 'limite');
    end if;
    perform private.register_check_in_failure(source);
    return jsonb_build_object('ok', false, 'result', 'sem_matricula');
  end if;

  if code_row.used_at is not null or exists (
    select 1
    from public.attendance_records recorded
    where recorded.session_id = v_session_id
      and recorded.student_id is not distinct from code_row.student_id
      and recorded.roster_student_id is not distinct from code_row.roster_student_id
  ) then
    update private.session_attendance_codes
    set used_at = coalesce(used_at, pg_catalog.now())
    where id = code_row.id;
    return jsonb_build_object(
      'ok', false,
      'result', 'duplicada',
      'name', student_name,
      'subject', subject_name
    );
  end if;

  perform set_config('presenca.public_code', v_session_id::text, true);
  insert into public.attendance_records (session_id, student_id, roster_student_id, mark, recorded_by)
  values (v_session_id, code_row.student_id, code_row.roster_student_id, 'presente', class_professor);
  update private.session_attendance_codes
  set used_at = pg_catalog.now()
  where id = code_row.id
    and used_at is null;
  perform set_config('presenca.public_code', '', true);

  return jsonb_build_object(
    'ok', true,
    'result', 'presente',
    'name', student_name,
    'subject', subject_name
  );
exception
  when unique_violation then
    perform set_config('presenca.public_code', '', true);
    update private.session_attendance_codes
    set used_at = coalesce(used_at, pg_catalog.now())
    where id = code_row.id;
    return jsonb_build_object(
      'ok', false,
      'result', 'duplicada',
      'name', student_name,
      'subject', subject_name
    );
  when others then
    perform set_config('presenca.public_code', '', true);
    raise;
end;
$$;

create or replace function public.withdraw_roster_enrollment(target_class uuid, target_student uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  teacher uuid := auth.uid();
  updated_id uuid;
begin
  if teacher is null then
    return jsonb_build_object('ok', false, 'message', 'Entre novamente para continuar.');
  end if;

  if not exists (
    select 1
    from public.classes class_row
    where class_row.id = target_class
      and class_row.professor_id = teacher
  ) or not exists (
    select 1
    from public.roster_students student
    where student.id = target_student
      and student.professor_id = teacher
  ) then
    return jsonb_build_object('ok', false, 'message', 'Você não pode alterar a matrícula de outra conta.');
  end if;

  update public.enrollments
  set withdrawn_at = pg_catalog.now()
  where class_id = target_class
    and roster_student_id = target_student
    and withdrawn_at is null
  returning id into updated_id;

  if updated_id is null then
    return jsonb_build_object('ok', false, 'message', 'Este aluno não está matriculado nesta disciplina.');
  end if;

  update private.session_attendance_codes codes
  set revoked_at = pg_catalog.now(),
      code_text = ''
  from public.class_sessions session_row
  where codes.session_id = session_row.id
    and session_row.class_id = target_class
    and session_row.status = 'aberta'
    and codes.roster_student_id = target_student
    and codes.used_at is null;

  return jsonb_build_object('ok', true, 'message', 'Aluno desmatriculado. O cadastro e as presenças anteriores foram mantidos.');
end;
$$;

create or replace function public.enroll_roster_student(target_class uuid, target_student uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  teacher uuid := auth.uid();
  existing_id uuid;
  withdrawn timestamptz;
begin
  if teacher is null then
    return jsonb_build_object('ok', false, 'message', 'Entre novamente para continuar.');
  end if;

  if not exists (
    select 1 from public.classes class_row
    where class_row.id = target_class and class_row.professor_id = teacher
  ) or not exists (
    select 1 from public.roster_students student
    where student.id = target_student and student.professor_id = teacher
  ) then
    return jsonb_build_object('ok', false, 'message', 'Você não pode matricular um aluno de outra conta.');
  end if;

  select id, withdrawn_at into existing_id, withdrawn
  from public.enrollments
  where class_id = target_class
    and roster_student_id = target_student;

  if existing_id is not null and withdrawn is null then
    return jsonb_build_object('ok', false, 'message', 'O aluno já está nesta disciplina.');
  end if;

  if existing_id is not null then
    update public.enrollments
    set withdrawn_at = null
    where id = existing_id;
    return jsonb_build_object('ok', true, 'message', 'Aluno matriculado novamente nesta disciplina.');
  end if;

  insert into public.enrollments (class_id, roster_student_id)
  values (target_class, target_student);
  return jsonb_build_object('ok', true, 'message', 'Aluno matriculado na disciplina.');
end;
$$;

create or replace function public.justify_closed_absence(target_record uuid, note text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  teacher uuid := auth.uid();
  current_mark public.attendance_mark;
  session_status public.session_status;
  owner uuid;
  roster_owner uuid;
  current_status public.justification_status;
  current_id uuid;
  clean_note text;
begin
  if teacher is null then
    return jsonb_build_object('ok', false, 'message', 'Entre novamente para continuar.');
  end if;

  clean_note := nullif(btrim(coalesce(note, '')), '');
  if clean_note is not null and char_length(clean_note) > 1000 then
    return jsonb_build_object('ok', false, 'message', 'O motivo pode ter até 1000 caracteres.');
  end if;

  select recorded.mark, recorded.student_id, recorded.roster_student_id, session_row.status
  into current_mark, owner, roster_owner, session_status
  from public.attendance_records recorded
  join public.class_sessions session_row on session_row.id = recorded.session_id
  join public.classes class_row on class_row.id = session_row.class_id
  where recorded.id = target_record
    and class_row.professor_id = teacher
  for update of recorded;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Registro não encontrado nesta conta.');
  end if;
  if session_status is distinct from 'encerrada' then
    return jsonb_build_object('ok', false, 'message', 'Justifique a falta depois de encerrar a chamada.');
  end if;
  if current_mark = 'presente' then
    return jsonb_build_object('ok', false, 'message', 'Uma presença confirmada não vira justificativa.');
  end if;

  select id, status into current_id, current_status
  from public.absence_justifications
  where attendance_record_id = target_record
  for update;

  if current_id is not null and current_status = 'aceita' then
    update public.absence_justifications
    set reason = clean_note
    where id = current_id;
    return jsonb_build_object('ok', true, 'message', 'Motivo da justificativa atualizado.');
  end if;

  if current_mark is distinct from 'falta' then
    return jsonb_build_object('ok', false, 'message', 'Só uma falta registrada pode ser justificada.');
  end if;

  perform set_config('presenca.professor_justification', target_record::text, true);
  if current_id is null then
    insert into public.absence_justifications (
      attendance_record_id, student_id, roster_student_id, reason, status
    ) values (
      target_record, owner, roster_owner, clean_note, 'aceita'
    );
  else
    update public.absence_justifications
    set status = 'aceita',
        reason = clean_note
    where id = current_id;
  end if;
  perform set_config('presenca.professor_justification', '', true);
  return jsonb_build_object('ok', true, 'message', 'Falta justificada. Ela não foi convertida em presença.');
exception
  when others then
    perform set_config('presenca.professor_justification', '', true);
    raise;
end;
$$;

create or replace function public.remove_absence_justification(target_record uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  teacher uuid := auth.uid();
  updated_id uuid;
begin
  if teacher is null then
    return jsonb_build_object('ok', false, 'message', 'Entre novamente para continuar.');
  end if;

  update public.absence_justifications justification
  set status = 'recusada',
      reason = null
  from public.attendance_records recorded
  join public.class_sessions session_row on session_row.id = recorded.session_id
  join public.classes class_row on class_row.id = session_row.class_id
  where justification.attendance_record_id = target_record
    and recorded.id = justification.attendance_record_id
    and class_row.professor_id = teacher
    and justification.status = 'aceita'
    and recorded.mark = 'justificada'
  returning justification.id into updated_id;

  if updated_id is null then
    return jsonb_build_object('ok', false, 'message', 'Não há justificativa aceita neste registro.');
  end if;
  return jsonb_build_object('ok', true, 'message', 'Justificativa removida. A falta voltou a constar na lista.');
end;
$$;

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
  session_mode text;
begin
  if token is null or token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'result', 'invalido');
  end if;

  token_hash := encode(extensions.digest(token, 'sha256'), 'hex');

  select s.status, s.code_expires_at, s.ends_at, s.public_check_in_mode, subject.name, academic_group.name, class_row.period
  into session_status, deadline, class_ends, session_mode, subject_name, group_name, period_label
  from public.class_sessions s
  join public.classes class_row on class_row.id = s.class_id
  join public.subjects subject on subject.id = class_row.subject_id
  left join public.academic_groups academic_group on academic_group.id = class_row.academic_group_id
  where s.check_in_token_hash = token_hash;

  if not found then
    return jsonb_build_object('ok', false, 'result', 'invalido');
  end if;

  if session_mode is distinct from 'codigo' then
    session_mode := 'matricula';
  end if;

  if session_status is distinct from 'aberta' then
    return jsonb_build_object(
      'ok', false,
      'result', 'encerrada',
      'check_in_mode', session_mode,
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
      'check_in_mode', session_mode,
      'subject', subject_name,
      'group', group_name,
      'period', period_label
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'result', 'aberta',
    'check_in_mode', session_mode,
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
  session_mode text;
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

  select s.id, s.status, s.code_expires_at, s.ends_at, s.class_id, s.public_check_in_mode, c.professor_id, subject.name
  into v_session_id, session_status, deadline, class_ends, target_class, session_mode, class_professor, subject_name
  from public.class_sessions s
  join public.classes c on c.id = s.class_id
  join public.subjects subject on subject.id = c.subject_id
  where s.check_in_token_hash = token_hash
  for update of s;

  if not found then
    return jsonb_build_object('ok', false, 'result', 'invalido');
  end if;

  if session_status is distinct from 'aberta' then
    perform private.revoke_session_codes(v_session_id);
    return jsonb_build_object('ok', false, 'result', 'encerrada', 'subject', subject_name);
  end if;

  if deadline is null or deadline < pg_catalog.now()
    or (class_ends is not null and class_ends < pg_catalog.now())
  then
    perform private.revoke_session_codes(v_session_id);
    return jsonb_build_object('ok', false, 'result', 'expirada', 'subject', subject_name);
  end if;

  if session_mode = 'codigo' then
    return jsonb_build_object('ok', false, 'result', 'codigo_obrigatorio', 'subject', subject_name);
  end if;

  select student.id, student.full_name
  into roster_id, student_name
  from public.roster_students student
  join public.enrollments enrollment on enrollment.roster_student_id = student.id
  where student.professor_id = class_professor
    and student.registration_code = trimmed
    and enrollment.class_id = target_class
    and enrollment.withdrawn_at is null;

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

comment on function public.confirm_public_attendance(text, text) is
  'Confirma por matrícula apenas chamadas no modo matricula. Chamada no modo codigo é recusada aqui, mesmo que a requisição chegue direto. Chamada vencida também é recusada, ainda que continue aberta.';

revoke all on function private.random_attendance_code() from public, anon, authenticated;
revoke all on function private.check_in_blocked(text) from public, anon, authenticated;
revoke all on function private.register_check_in_failure(text) from public, anon, authenticated;
revoke all on function private.revoke_session_codes(uuid) from public, anon, authenticated;
revoke all on function private.finish_open_session(uuid, uuid, timestamptz) from public, anon, authenticated;
revoke all on function private.issue_codes_for_new_session() from public, anon, authenticated;

revoke all on function private.guard_class_session() from public, anon;
revoke all on function private.guard_attendance_record() from public, anon;
revoke all on function private.guard_justification() from public, anon;
revoke all on function private.apply_accepted_justification() from public, anon;
grant execute on function private.guard_class_session() to authenticated;
grant execute on function private.guard_attendance_record() to authenticated;
grant execute on function private.guard_justification() to authenticated;
grant execute on function private.apply_accepted_justification() to authenticated;
grant execute on function private.issue_codes_for_new_session() to authenticated;

revoke all on function public.describe_public_check_in(text) from public, anon, authenticated;
revoke all on function public.confirm_public_attendance(text, text) from public, anon, authenticated;
revoke all on function public.close_class_session(uuid) from public, anon;
grant execute on function public.close_class_session(uuid) to authenticated;

revoke all on function public.ensure_session_attendance_codes(uuid) from public, anon;
revoke all on function public.confirm_public_attendance_by_code(text, text, text) from public, anon, authenticated;
revoke all on function public.withdraw_roster_enrollment(uuid, uuid) from public, anon;
revoke all on function public.enroll_roster_student(uuid, uuid) from public, anon;
revoke all on function public.justify_closed_absence(uuid, text) from public, anon;
revoke all on function public.remove_absence_justification(uuid) from public, anon;
revoke all on function public.settle_expired_calls() from public, anon;

grant execute on function public.ensure_session_attendance_codes(uuid) to authenticated;
grant execute on function public.withdraw_roster_enrollment(uuid, uuid) to authenticated;
grant execute on function public.enroll_roster_student(uuid, uuid) to authenticated;
grant execute on function public.justify_closed_absence(uuid, text) to authenticated;
grant execute on function public.remove_absence_justification(uuid) to authenticated;
grant execute on function public.settle_expired_calls() to authenticated;
grant update (period, schedule, room, updated_at) on table public.classes to authenticated;
grant select (public_check_in_mode) on table public.class_sessions to authenticated;
grant insert (public_check_in_mode) on table public.class_sessions to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    revoke all on table private.session_attendance_codes from service_role;
    revoke all on table private.check_in_failures from service_role;
    revoke all on table private.app_settings from service_role;
    revoke all on function private.individual_codes_required() from service_role;
    revoke all on function private.random_attendance_code() from service_role;
    revoke all on function private.check_in_blocked(text) from service_role;
    revoke all on function private.register_check_in_failure(text) from service_role;
    revoke all on function private.revoke_session_codes(uuid) from service_role;
    revoke all on function private.finish_open_session(uuid, uuid, timestamptz) from service_role;
    revoke all on function private.issue_codes_for_new_session() from service_role;
    grant execute on function public.confirm_public_attendance_by_code(text, text, text) to service_role;
    grant execute on function public.describe_public_check_in(text) to service_role;
    grant execute on function public.confirm_public_attendance(text, text) to service_role;
    revoke all on function public.close_class_session(uuid) from service_role;
    revoke all on function public.ensure_session_attendance_codes(uuid) from service_role;
  end if;
end $$;

comment on function public.confirm_public_attendance_by_code(text, text, text) is
  'Confirma presença pelo código individual desta chamada. Não devolve o código. Não impede que o aluno compartilhe o próprio código.';

comment on function public.settle_expired_calls() is
  'Encerra somente chamadas abertas de hoje, no fuso de São Paulo, cujo prazo de 40 minutos já passou. Não revisa chamadas de dias anteriores.';

commit;
