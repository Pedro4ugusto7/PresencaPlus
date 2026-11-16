-- Presença+ — estrutura acadêmica, chamada e segurança.
-- Migração inicial de execução única, num projeto que ainda não tem estas tabelas.
-- Não reaplicar depois que as políticas existirem: este arquivo não usa CASCADE
-- e para se alguma função já tiver dependência.
-- Não apaga tabelas, não cria usuários e não grava senhas.
-- O aplicativo usa apenas a chave publicável.

do $$
begin
  create type public.user_role as enum ('professor', 'aluno');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.attendance_mark as enum ('presente', 'falta', 'justificada');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.session_status as enum ('aberta', 'encerrada');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.justification_status as enum ('pendente', 'aceita', 'recusada');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  full_name text not null default '',
  institution text not null default '',
  course text not null default '',
  identifier text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (char_length(full_name) <= 160),
  constraint profiles_institution_length check (char_length(institution) <= 160),
  constraint profiles_course_length check (char_length(course) <= 160),
  constraint profiles_identifier_length check (char_length(identifier) <= 40)
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  program text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subjects_name_length check (char_length(btrim(name)) between 1 and 160),
  constraint subjects_program_length check (char_length(btrim(program)) between 1 and 160)
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete restrict,
  professor_id uuid not null references public.profiles (id) on delete restrict,
  period text not null,
  schedule text not null,
  room text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classes_period_length check (char_length(btrim(period)) between 1 and 80),
  constraint classes_schedule_length check (char_length(btrim(schedule)) between 1 and 160),
  constraint classes_room_length check (char_length(btrim(room)) between 1 and 80),
  constraint classes_subject_professor_period_unique unique (subject_id, professor_id, period)
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enrollments_class_student_unique unique (class_id, student_id)
);

create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  code_expires_at timestamptz,
  status public.session_status not null default 'aberta',
  code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_sessions_code_format check (code is null or code ~ '^[0-9]{6}$'),
  constraint class_sessions_time_order check (ends_at is null or ends_at > starts_at),
  constraint class_sessions_code_expiry check (code_expires_at is null or code_expires_at > starts_at)
);

create unique index if not exists class_sessions_one_open
  on public.class_sessions (class_id)
  where status = 'aberta';

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  mark public.attendance_mark not null,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_records_session_student_unique unique (session_id, student_id)
);

create table if not exists public.absence_justifications (
  id uuid primary key default gen_random_uuid(),
  attendance_record_id uuid not null references public.attendance_records (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  status public.justification_status not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint absence_justifications_reason_length check (char_length(btrim(reason)) between 1 and 1000),
  constraint absence_justifications_record_unique unique (attendance_record_id)
);

create index if not exists classes_professor_id_idx on public.classes (professor_id);
create index if not exists classes_subject_id_idx on public.classes (subject_id);
create index if not exists enrollments_student_id_idx on public.enrollments (student_id);
create index if not exists enrollments_class_id_idx on public.enrollments (class_id);
create index if not exists class_sessions_class_starts_idx on public.class_sessions (class_id, starts_at desc);
create index if not exists attendance_records_student_id_idx on public.attendance_records (student_id);
create index if not exists attendance_records_session_id_idx on public.attendance_records (session_id);
create index if not exists absence_justifications_student_id_idx on public.absence_justifications (student_id);
create index if not exists profiles_role_idx on public.profiles (role);

-- Funções auxiliares ficam fora da API. O aplicativo só chama public.session_code.
-- Sem sessão do aplicativo, auth.uid() é nulo e o SQL Editor pode corrigir o histórico.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
grant usage on schema private to supabase_auth_admin;
comment on schema private is 'Funções internas do Presença+. Este esquema não entra na API.';

drop trigger if exists profiles_touch on public.profiles;
drop trigger if exists profiles_protect_role on public.profiles;
drop trigger if exists subjects_touch on public.subjects;
drop trigger if exists classes_touch on public.classes;
drop trigger if exists classes_guard_professor on public.classes;
drop trigger if exists enrollments_touch on public.enrollments;
drop trigger if exists enrollments_guard_student on public.enrollments;
drop trigger if exists class_sessions_touch on public.class_sessions;
drop trigger if exists class_sessions_guard on public.class_sessions;
drop trigger if exists attendance_records_touch on public.attendance_records;
drop trigger if exists attendance_records_guard on public.attendance_records;
drop trigger if exists absence_justifications_touch on public.absence_justifications;
drop trigger if exists absence_justifications_guard on public.absence_justifications;
drop trigger if exists absence_justifications_apply on public.absence_justifications;
drop trigger if exists on_auth_user_created on auth.users;

-- Remove só funções públicas de um rascunho anterior. Sem CASCADE:
-- se alguma política já depender delas, a migração para.
drop function if exists public.touch_updated_at();
drop function if exists public.protect_profile_role();
drop function if exists public.guard_class_professor();
drop function if exists public.guard_enrollment_student();
drop function if exists public.guard_class_session();
drop function if exists public.guard_attendance_record();
drop function if exists public.guard_justification();
drop function if exists public.apply_accepted_justification();
drop function if exists public.handle_new_user();
drop function if exists public.enrolled_in_class(uuid);
drop function if exists public.teaches_class(uuid);
drop function if exists public.teaches_session(uuid);
drop function if exists public.can_read_subject(uuid);
drop function if exists public.professor_sees_student(uuid);
drop function if exists public.student_sees_professor(uuid);
drop function if exists public.teaches_attendance(uuid);
drop function if exists public.professor_can_record(uuid, uuid);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.protect_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'o perfil acadêmico não pode ser alterado por esta conta';
  end if;
  return new;
end;
$$;

create or replace function private.guard_class_professor()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  professor_role public.user_role;
begin
  select role into professor_role from public.profiles where id = new.professor_id;
  if professor_role is distinct from 'professor' then
    raise exception 'a turma precisa de um perfil de professor';
  end if;
  return new;
end;
$$;

create or replace function private.guard_enrollment_student()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  student_role public.user_role;
begin
  select role into student_role from public.profiles where id = new.student_id;
  if student_role is distinct from 'aluno' then
    raise exception 'a matrícula precisa de um perfil de aluno';
  end if;
  return new;
end;
$$;

-- ends_at é o fim da aula. code_expires_at é a validade do código.
-- Pelo aplicativo a aula dura no máximo 4 horas e o código, 30 minutos.
-- auth.uid() nulo preserva a correção administrativa no SQL Editor.
create or replace function private.guard_class_session()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null then
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
      or new.code_expires_at > new.starts_at + interval '30 minutes'
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
    if new.starts_at > now() + interval '15 minutes' then
      raise exception 'o início da chamada não pode estar no futuro';
    end if;
    if new.starts_at < now() - interval '12 hours' then
      raise exception 'o início da chamada está fora do período permitido';
    end if;
    if new.code_expires_at <= now() then
      raise exception 'a validade do código já expirou';
    end if;
    return new;
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
    if new.ends_at > now() + interval '5 minutes' then
      raise exception 'o encerramento não pode ficar no futuro';
    end if;
    if new.code_expires_at is distinct from old.code_expires_at then
      raise exception 'a validade do código não pode ser alterada no encerramento';
    end if;
    if new.code is not null and new.code is distinct from old.code then
      raise exception 'o código da chamada não pode ser adulterado';
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
      and e.student_id = new.student_id
  ) into enrolled;

  if not enrolled then
    raise exception 'o aluno não está matriculado nesta turma';
  end if;

  if auth.uid() is null then
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
    if code_deadline is null or code_deadline < now() then
      raise exception 'o código desta chamada não está mais válido';
    end if;
    if class_ends is not null and class_ends < now() then
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
  if code_deadline is null or code_deadline < now() then
    raise exception 'o código desta chamada não está mais válido';
  end if;
  if class_ends is not null and class_ends < now() then
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
  current_mark public.attendance_mark;
begin
  select student_id, mark into owner, current_mark
  from public.attendance_records
  where id = new.attendance_record_id;

  if owner is null or owner is distinct from new.student_id then
    raise exception 'a justificativa não pertence a este aluno';
  end if;

  if tg_op = 'UPDATE' and (
    new.student_id is distinct from old.student_id
    or new.attendance_record_id is distinct from old.attendance_record_id
  ) then
    raise exception 'o vínculo da justificativa não pode ser trocado';
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
  if new.status = 'aceita' and old.status is distinct from 'aceita' then
    perform set_config('presenca.justification_apply', new.attendance_record_id::text, true);
    update public.attendance_records
    set mark = 'justificada', updated_at = now()
    where id = new.attendance_record_id
      and mark = 'falta';
    if not found then
      raise exception 'somente uma falta pode ser justificada';
    end if;
    perform set_config('presenca.justification_apply', '', true);
  elsif old.status = 'aceita' and new.status = 'recusada' then
    perform set_config('presenca.justification_apply', new.attendance_record_id::text, true);
    update public.attendance_records
    set mark = 'falta', updated_at = now()
    where id = new.attendance_record_id
      and mark = 'justificada';
    if not found then
      raise exception 'a recusa não conseguiu restaurar a falta';
    end if;
    perform set_config('presenca.justification_apply', '', true);
  end if;
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested text;
begin
  requested := new.raw_app_meta_data ->> 'role';
  if requested is null or requested not in ('professor', 'aluno') then
    return new;
  end if;

  insert into public.profiles (id, role, full_name, institution, course, identifier)
  values (
    new.id,
    requested::public.user_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'institution', ''),
    coalesce(new.raw_user_meta_data ->> 'course', ''),
    coalesce(new.raw_user_meta_data ->> 'identifier', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.provision_profile(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested text;
  meta jsonb;
  user_meta jsonb;
begin
  if auth.uid() is not null then
    raise exception 'o provisionamento de perfil não pode ser feito pela sessão do aplicativo';
  end if;

  select raw_app_meta_data, raw_user_meta_data into meta, user_meta
  from auth.users
  where id = target;

  if not found then
    raise exception 'usuário não encontrado';
  end if;

  requested := meta ->> 'role';
  if requested is null or requested not in ('professor', 'aluno') then
    raise exception 'defina app_metadata.role como professor ou aluno antes de provisionar';
  end if;

  insert into public.profiles (id, role, full_name, institution, course, identifier)
  values (
    target,
    requested::public.user_role,
    coalesce(user_meta ->> 'full_name', ''),
    coalesce(user_meta ->> 'institution', ''),
    coalesce(user_meta ->> 'course', ''),
    coalesce(user_meta ->> 'identifier', '')
  )
  on conflict (id) do nothing;
end;
$$;

-- O código da chamada não entra no select do aluno. Só o professor da turma o recebe.
create or replace function public.session_code(target uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.code
  from public.class_sessions s
  join public.classes c on c.id = s.class_id
  where s.id = target
    and c.professor_id = auth.uid()
$$;

-- Predicados SECURITY DEFINER para as políticas não consultarem tabelas com RLS
-- e entrarem em recursão. Cada função devolve apenas um booleano da sessão atual.
create or replace function private.enrolled_in_class(target_class uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments
    where class_id = target_class and student_id = auth.uid()
  );
$$;

create or replace function private.teaches_class(target_class uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.classes
    where id = target_class and professor_id = auth.uid()
  );
$$;

create or replace function private.teaches_session(target_session uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.class_sessions session_row
    join public.classes class_row on class_row.id = session_row.class_id
    where session_row.id = target_session
      and class_row.professor_id = auth.uid()
  );
$$;

create or replace function private.can_read_subject(target_subject uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.classes class_row
    where class_row.subject_id = target_subject
      and (
        class_row.professor_id = auth.uid()
        or exists (
          select 1 from public.enrollments enrollment_row
          where enrollment_row.class_id = class_row.id
            and enrollment_row.student_id = auth.uid()
        )
      )
  );
$$;

create or replace function private.professor_sees_student(target_student uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.enrollments enrollment_row
    join public.classes class_row on class_row.id = enrollment_row.class_id
    where enrollment_row.student_id = target_student
      and class_row.professor_id = auth.uid()
  );
$$;

create or replace function private.student_sees_professor(target_professor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.enrollments enrollment_row
    join public.classes class_row on class_row.id = enrollment_row.class_id
    where enrollment_row.student_id = auth.uid()
      and class_row.professor_id = target_professor
  );
$$;

create or replace function private.teaches_attendance(target_record uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.attendance_records recorded
    join public.class_sessions session_row on session_row.id = recorded.session_id
    join public.classes class_row on class_row.id = session_row.class_id
    where recorded.id = target_record
      and class_row.professor_id = auth.uid()
  );
$$;

create or replace function private.professor_can_record(target_session uuid, target_student uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.class_sessions session_row
    join public.classes class_row on class_row.id = session_row.class_id
    join public.enrollments enrollment_row on enrollment_row.class_id = class_row.id
    where session_row.id = target_session
      and session_row.status = 'aberta'
      and session_row.code_expires_at is not null
      and session_row.code_expires_at >= now()
      and (session_row.ends_at is null or session_row.ends_at >= now())
      and class_row.professor_id = auth.uid()
      and enrollment_row.student_id = target_student
  );
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
for each row execute function private.touch_updated_at();

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
for each row execute function private.protect_profile_role();

drop trigger if exists subjects_touch on public.subjects;
create trigger subjects_touch before update on public.subjects
for each row execute function private.touch_updated_at();

drop trigger if exists classes_touch on public.classes;
create trigger classes_touch before update on public.classes
for each row execute function private.touch_updated_at();

drop trigger if exists classes_guard_professor on public.classes;
create trigger classes_guard_professor before insert or update on public.classes
for each row execute function private.guard_class_professor();

drop trigger if exists enrollments_touch on public.enrollments;
create trigger enrollments_touch before update on public.enrollments
for each row execute function private.touch_updated_at();

drop trigger if exists enrollments_guard_student on public.enrollments;
create trigger enrollments_guard_student before insert or update on public.enrollments
for each row execute function private.guard_enrollment_student();

drop trigger if exists class_sessions_touch on public.class_sessions;
create trigger class_sessions_touch before update on public.class_sessions
for each row execute function private.touch_updated_at();

drop trigger if exists class_sessions_guard on public.class_sessions;
create trigger class_sessions_guard before insert or update on public.class_sessions
for each row execute function private.guard_class_session();

drop trigger if exists attendance_records_touch on public.attendance_records;
create trigger attendance_records_touch before update on public.attendance_records
for each row execute function private.touch_updated_at();

drop trigger if exists attendance_records_guard on public.attendance_records;
create trigger attendance_records_guard before insert or update on public.attendance_records
for each row execute function private.guard_attendance_record();

drop trigger if exists absence_justifications_touch on public.absence_justifications;
create trigger absence_justifications_touch before update on public.absence_justifications
for each row execute function private.touch_updated_at();

drop trigger if exists absence_justifications_guard on public.absence_justifications;
create trigger absence_justifications_guard before insert or update on public.absence_justifications
for each row execute function private.guard_justification();

drop trigger if exists absence_justifications_apply on public.absence_justifications;
create trigger absence_justifications_apply after update on public.absence_justifications
for each row execute function private.apply_accepted_justification();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function public.provision_profile(uuid) from public, anon, authenticated;
revoke all on function public.session_code(uuid) from public, anon;
revoke all on function private.enrolled_in_class(uuid) from public, anon;
revoke all on function private.teaches_class(uuid) from public, anon;
revoke all on function private.teaches_session(uuid) from public, anon;
revoke all on function private.can_read_subject(uuid) from public, anon;
revoke all on function private.professor_sees_student(uuid) from public, anon;
revoke all on function private.student_sees_professor(uuid) from public, anon;
revoke all on function private.teaches_attendance(uuid) from public, anon;
revoke all on function private.professor_can_record(uuid, uuid) from public, anon;
revoke all on function private.apply_accepted_justification() from public, anon;
revoke all on function private.touch_updated_at() from public, anon;
revoke all on function private.protect_profile_role() from public, anon;
revoke all on function private.guard_class_professor() from public, anon;
revoke all on function private.guard_enrollment_student() from public, anon;
revoke all on function private.guard_class_session() from public, anon;
revoke all on function private.guard_attendance_record() from public, anon;
revoke all on function private.guard_justification() from public, anon;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    revoke all on function public.provision_profile(uuid) from service_role;
    revoke all on function private.handle_new_user() from service_role;
  end if;
end $$;

grant execute on function public.session_code(uuid) to authenticated;
grant execute on function private.enrolled_in_class(uuid) to authenticated;
grant execute on function private.teaches_class(uuid) to authenticated;
grant execute on function private.teaches_session(uuid) to authenticated;
grant execute on function private.can_read_subject(uuid) to authenticated;
grant execute on function private.professor_sees_student(uuid) to authenticated;
grant execute on function private.student_sees_professor(uuid) to authenticated;
grant execute on function private.teaches_attendance(uuid) to authenticated;
grant execute on function private.professor_can_record(uuid, uuid) to authenticated;
grant execute on function private.touch_updated_at() to authenticated;
grant execute on function private.protect_profile_role() to authenticated;
grant execute on function private.guard_class_professor() to authenticated;
grant execute on function private.guard_enrollment_student() to authenticated;
grant execute on function private.guard_class_session() to authenticated;
grant execute on function private.guard_attendance_record() to authenticated;
grant execute on function private.guard_justification() to authenticated;
grant execute on function private.apply_accepted_justification() to authenticated;
grant execute on function private.handle_new_user() to supabase_auth_admin;

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.classes enable row level security;
alter table public.enrollments enable row level security;
alter table public.class_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.absence_justifications enable row level security;

drop policy if exists profiles_select_related on public.profiles;
create policy profiles_select_related on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or private.professor_sees_student(id)
  or private.student_sees_professor(id)
);

drop policy if exists subjects_select_related on public.subjects;
create policy subjects_select_related on public.subjects
for select to authenticated
using (private.can_read_subject(id));

drop policy if exists classes_select_related on public.classes;
create policy classes_select_related on public.classes
for select to authenticated
using (professor_id = auth.uid() or private.enrolled_in_class(id));

drop policy if exists enrollments_select_related on public.enrollments;
create policy enrollments_select_related on public.enrollments
for select to authenticated
using (student_id = auth.uid() or private.teaches_class(class_id));

drop policy if exists class_sessions_select_related on public.class_sessions;
create policy class_sessions_select_related on public.class_sessions
for select to authenticated
using (private.teaches_class(class_id) or private.enrolled_in_class(class_id));

drop policy if exists class_sessions_insert_professor on public.class_sessions;
create policy class_sessions_insert_professor on public.class_sessions
for insert to authenticated
with check (
  private.teaches_class(class_id)
  and status = 'aberta'
  and code ~ '^[0-9]{6}$'
  and code_expires_at is not null
);

drop policy if exists class_sessions_update_professor on public.class_sessions;
create policy class_sessions_update_professor on public.class_sessions
for update to authenticated
using (private.teaches_class(class_id))
with check (private.teaches_class(class_id));

drop policy if exists attendance_select_related on public.attendance_records;
create policy attendance_select_related on public.attendance_records
for select to authenticated
using (student_id = auth.uid() or private.teaches_session(session_id));

drop policy if exists attendance_insert_professor on public.attendance_records;
create policy attendance_insert_professor on public.attendance_records
for insert to authenticated
with check (
  recorded_by = auth.uid()
  and private.professor_can_record(session_id, student_id)
);

drop policy if exists attendance_update_professor on public.attendance_records;
create policy attendance_update_professor on public.attendance_records
for update to authenticated
using (private.teaches_session(session_id))
with check (
  recorded_by = auth.uid()
  and private.teaches_session(session_id)
);

drop policy if exists justifications_select_related on public.absence_justifications;
create policy justifications_select_related on public.absence_justifications
for select to authenticated
using (student_id = auth.uid() or private.teaches_attendance(attendance_record_id));

drop policy if exists justifications_insert_student on public.absence_justifications;
create policy justifications_insert_student on public.absence_justifications
for insert to authenticated
with check (
  student_id = auth.uid()
  and status = 'pendente'
  and exists (
    select 1 from public.attendance_records recorded
    where recorded.id = absence_justifications.attendance_record_id
      and recorded.student_id = auth.uid()
      and recorded.mark = 'falta'
  )
);

drop policy if exists justifications_update_professor on public.absence_justifications;
create policy justifications_update_professor on public.absence_justifications
for update to authenticated
using (private.teaches_attendance(attendance_record_id))
with check (
  status in ('aceita', 'recusada')
  and private.teaches_attendance(attendance_record_id)
);

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.subjects from anon, authenticated;
revoke all on table public.classes from anon, authenticated;
revoke all on table public.enrollments from anon, authenticated;
revoke all on table public.class_sessions from anon, authenticated;
revoke all on table public.attendance_records from anon, authenticated;
revoke all on table public.absence_justifications from anon, authenticated;

grant select on table public.profiles to authenticated;
grant select on table public.subjects to authenticated;
grant select on table public.classes to authenticated;
grant select on table public.enrollments to authenticated;
grant select (
  id,
  class_id,
  starts_at,
  ends_at,
  code_expires_at,
  status,
  created_at,
  updated_at
) on table public.class_sessions to authenticated;
grant insert (
  class_id,
  starts_at,
  ends_at,
  code_expires_at,
  status,
  code
) on table public.class_sessions to authenticated;
grant update (
  ends_at,
  code_expires_at,
  status,
  code,
  updated_at
) on table public.class_sessions to authenticated;
grant select, insert, update on table public.attendance_records to authenticated;
grant select, insert on table public.absence_justifications to authenticated;
grant update (status, updated_at) on table public.absence_justifications to authenticated;

revoke delete on table public.profiles from anon, authenticated;
revoke delete on table public.subjects from anon, authenticated;
revoke delete on table public.classes from anon, authenticated;
revoke delete on table public.enrollments from anon, authenticated;
revoke delete on table public.class_sessions from anon, authenticated;
revoke delete on table public.attendance_records from anon, authenticated;
revoke delete on table public.absence_justifications from anon, authenticated;

