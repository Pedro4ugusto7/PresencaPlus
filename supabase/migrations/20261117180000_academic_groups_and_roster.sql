BEGIN;

-- Presença+ — turma acadêmica e cadastro de alunos sem conta.
-- Migração nova. Não altera os três arquivos anteriores.
-- Não apaga tabelas, contas, chamadas nem presenças. Não cria senha.
-- Executar o arquivo inteiro uma única vez, depois da revisão.
-- Se qualquer comando falhar, interromper. Não reaplicar as migrações antigas.
--
-- public.classes continua sendo a oferta: professor + disciplina + período.
-- public.academic_groups é a turma compartilhada, como 5º Período.
-- Ofertas já gravadas ficam com academic_group_id nulo. Nada é preenchido no escuro.
-- O índice class_sessions_one_academic_day não é recriado nem removido.

create table public.academic_groups (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles (id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_groups_name_length check (char_length(btrim(name)) between 1 and 80),
  constraint academic_groups_professor_name_unique unique (professor_id, name)
);

create table public.roster_students (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles (id) on delete restrict,
  full_name text not null,
  registration_code text not null,
  created_at timestamptz not null default now(),
  constraint roster_students_name_length check (char_length(btrim(full_name)) between 1 and 160),
  constraint roster_students_code_length check (char_length(btrim(registration_code)) between 1 and 40),
  constraint roster_students_professor_code_unique unique (professor_id, registration_code)
);

comment on table public.academic_groups is
  'Turma acadêmica do professor, como 5º Período. A oferta de disciplina continua em public.classes.';

comment on table public.roster_students is
  'Aluno cadastrado pelo professor, sem conta, senha ou e-mail. A matrícula é única para esse professor.';

alter table public.subjects
  add column created_by uuid references public.profiles (id) on delete set null;

comment on column public.subjects.created_by is
  'Professor que criou a disciplina. Nulo nas disciplinas já existentes, que continuam visíveis pela oferta.';

alter table public.classes
  add column academic_group_id uuid references public.academic_groups (id) on delete restrict;

comment on column public.classes.academic_group_id is
  'Turma acadêmica desta oferta. Nulo nas ofertas anteriores; elas não são reassociadas automaticamente.';

create index classes_academic_group_id_idx
  on public.classes (academic_group_id);

-- A unicidade antiga impedia a mesma disciplina no mesmo período em duas turmas.
-- As linhas existentes têm academic_group_id nulo e continuam únicas por esse índice.
-- Duas turmas podem ter a mesma disciplina e o mesmo período. A mesma turma, não.
alter table public.classes
  drop constraint classes_subject_professor_period_unique;

create unique index classes_subject_professor_period_without_group_unique
  on public.classes (subject_id, professor_id, period)
  where academic_group_id is null;

create unique index classes_subject_professor_period_group_unique
  on public.classes (subject_id, professor_id, period, academic_group_id)
  where academic_group_id is not null;

alter table public.enrollments
  alter column student_id drop not null;

alter table public.enrollments
  add column roster_student_id uuid references public.roster_students (id) on delete restrict;

alter table public.enrollments
  add constraint enrollments_exactly_one_student check (
    (student_id is not null and roster_student_id is null)
    or (student_id is null and roster_student_id is not null)
  );

-- O unique (class_id, student_id) permanece. Vários student_id nulos não conflitam.
-- Não o converta para NULLS NOT DISTINCT: isso caberia um único aluno sem conta por oferta.
create unique index enrollments_class_roster_unique
  on public.enrollments (class_id, roster_student_id)
  where roster_student_id is not null;

alter table public.attendance_records
  alter column student_id drop not null;

alter table public.attendance_records
  add column roster_student_id uuid references public.roster_students (id) on delete restrict;

alter table public.attendance_records
  add constraint attendance_records_exactly_one_student check (
    (student_id is not null and roster_student_id is null)
    or (student_id is null and roster_student_id is not null)
  );

create unique index attendance_records_session_roster_unique
  on public.attendance_records (session_id, roster_student_id)
  where roster_student_id is not null;

create or replace function private.guard_academic_group()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  owner_role public.user_role;
begin
  new.name := btrim(new.name);

  if tg_op = 'UPDATE' and new.professor_id is distinct from old.professor_id then
    raise exception 'o responsável da turma acadêmica não pode ser trocado';
  end if;

  if auth.uid() is not null and auth.uid() is distinct from new.professor_id then
    raise exception 'a turma acadêmica pertence a outro professor';
  end if;

  select role into owner_role from public.profiles where id = new.professor_id;
  if owner_role is distinct from 'professor' then
    raise exception 'a turma acadêmica precisa de um perfil de professor';
  end if;

  return new;
end;
$$;

create or replace function private.guard_roster_student()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  owner_role public.user_role;
begin
  new.full_name := btrim(new.full_name);
  new.registration_code := btrim(new.registration_code);

  if tg_op = 'UPDATE' and new.professor_id is distinct from old.professor_id then
    raise exception 'o responsável do aluno não pode ser trocado';
  end if;

  if auth.uid() is not null and auth.uid() is distinct from new.professor_id then
    raise exception 'o cadastro pertence a outro professor';
  end if;

  select role into owner_role from public.profiles where id = new.professor_id;
  if owner_role is distinct from 'professor' then
    raise exception 'o cadastro de aluno precisa de um perfil de professor';
  end if;

  return new;
end;
$$;

create or replace function private.guard_subject_author()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  author_role public.user_role;
begin
  if tg_op = 'UPDATE' and new.created_by is distinct from old.created_by then
    raise exception 'o autor da disciplina não pode ser trocado';
  end if;

  if new.created_by is null then
    return new;
  end if;

  if auth.uid() is not null and auth.uid() is distinct from new.created_by then
    raise exception 'a disciplina pertence a outro professor';
  end if;

  select role into author_role from public.profiles where id = new.created_by;
  if author_role is distinct from 'professor' then
    raise exception 'a disciplina precisa de um perfil de professor';
  end if;

  return new;
end;
$$;

create or replace function private.guard_class_academic_group()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  group_professor uuid;
begin
  if new.academic_group_id is null then
    return new;
  end if;

  select professor_id into group_professor
  from public.academic_groups
  where id = new.academic_group_id;

  if group_professor is distinct from new.professor_id then
    raise exception 'a turma acadêmica pertence a outro professor';
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
  roster_professor uuid;
  class_professor uuid;
begin
  if tg_op = 'UPDATE' and (
    new.class_id is distinct from old.class_id
    or new.student_id is distinct from old.student_id
    or new.roster_student_id is distinct from old.roster_student_id
  ) then
    raise exception 'a matrícula não pode trocar a oferta nem o aluno';
  end if;

  if new.student_id is not null and new.roster_student_id is null then
    select role into student_role from public.profiles where id = new.student_id;
    if student_role is distinct from 'aluno' then
      raise exception 'a matrícula precisa de um perfil de aluno';
    end if;
    return new;
  end if;

  if new.student_id is not null or new.roster_student_id is null then
    raise exception 'a matrícula precisa de um único aluno';
  end if;

  select c.professor_id, rs.professor_id
  into class_professor, roster_professor
  from public.classes c
  join public.roster_students rs on rs.id = new.roster_student_id
  where c.id = new.class_id;

  if class_professor is null or roster_professor is distinct from class_professor then
    raise exception 'o aluno não pode ser vinculado a uma oferta de outro professor';
  end if;

  if auth.uid() is not null and auth.uid() is distinct from class_professor then
    raise exception 'a matrícula pertence a outro professor';
  end if;

  return new;
end;
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
    from public.subjects subject_row
    where subject_row.id = target_subject
      and subject_row.created_by = auth.uid()
  )
  or exists (
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

-- A confirmação public.confirm_attendance permanece a do aluno autenticado.
-- O aluno sem conta ainda não confirma presença por esta função.
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

  -- Somente a conexao administrativa do SQL Editor (postgres) pode
  -- operar diretamente sem JWT. anon e service_role nao recebem excecao.
  if auth.uid() is null and session_user = 'postgres' then
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

create or replace function private.guard_class_session()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Somente a conexao administrativa do SQL Editor (postgres) pode
  -- operar diretamente sem JWT. anon e service_role nao recebem excecao.
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
    if new.starts_at > pg_catalog.now() + interval '15 minutes' then
      raise exception 'o início da chamada não pode estar no futuro';
    end if;
    if new.starts_at < pg_catalog.now() - interval '12 hours' then
      raise exception 'o início da chamada está fora do período permitido';
    end if;
    if new.code_expires_at <= pg_catalog.now() then
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

-- O encerramento também completa falta de quem está no cadastro sem conta.
-- A regra de horário e o bloqueio de chamada futura permanecem.
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
  target_class uuid;
  started timestamptz;
  finished timestamptz;
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

  select s.status, s.class_id, s.starts_at
  into session_status, target_class, started
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

  finished := least(pg_catalog.now(), started + interval '4 hours');
  if finished <= started then
    finished := started + interval '1 second';
  end if;

  if finished <= started
     or finished > started + interval '4 hours'
     or finished > pg_catalog.now() + interval '5 minutes'
  then
    return jsonb_build_object('ok', false, 'result', 'horario_invalido');
  end if;

  perform set_config('presenca.session_close', target_session::text, true);
  insert into public.attendance_records (session_id, student_id, roster_student_id, mark, recorded_by)
  select target_session, e.student_id, e.roster_student_id, 'falta', teacher
  from public.enrollments e
  where e.class_id = target_class
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

  update public.class_sessions
  set status = 'encerrada',
      ends_at = finished,
      code = null
  where id = target_session;

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

drop trigger if exists academic_groups_touch on public.academic_groups;
create trigger academic_groups_touch before update on public.academic_groups
for each row execute function private.touch_updated_at();

drop trigger if exists academic_groups_guard on public.academic_groups;
create trigger academic_groups_guard before insert or update on public.academic_groups
for each row execute function private.guard_academic_group();

drop trigger if exists roster_students_guard on public.roster_students;
create trigger roster_students_guard before insert or update on public.roster_students
for each row execute function private.guard_roster_student();

drop trigger if exists subjects_guard_author on public.subjects;
create trigger subjects_guard_author before insert or update on public.subjects
for each row execute function private.guard_subject_author();

drop trigger if exists classes_guard_academic_group on public.classes;
create trigger classes_guard_academic_group before insert or update on public.classes
for each row execute function private.guard_class_academic_group();

revoke all on function private.guard_academic_group() from public, anon;
revoke all on function private.guard_roster_student() from public, anon;
revoke all on function private.guard_subject_author() from public, anon;
revoke all on function private.guard_class_academic_group() from public, anon;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    revoke all on function private.guard_academic_group() from service_role;
    revoke all on function private.guard_roster_student() from service_role;
    revoke all on function private.guard_subject_author() from service_role;
    revoke all on function private.guard_class_academic_group() from service_role;
  end if;
end $$;

grant execute on function private.guard_academic_group() to authenticated;
grant execute on function private.guard_roster_student() to authenticated;
grant execute on function private.guard_subject_author() to authenticated;
grant execute on function private.guard_class_academic_group() to authenticated;

alter table public.academic_groups enable row level security;
alter table public.roster_students enable row level security;

drop policy if exists academic_groups_select_own on public.academic_groups;
create policy academic_groups_select_own on public.academic_groups
for select to authenticated
using (professor_id = auth.uid());

drop policy if exists academic_groups_insert_own on public.academic_groups;
create policy academic_groups_insert_own on public.academic_groups
for insert to authenticated
with check (professor_id = auth.uid());

drop policy if exists academic_groups_update_own on public.academic_groups;
create policy academic_groups_update_own on public.academic_groups
for update to authenticated
using (professor_id = auth.uid())
with check (professor_id = auth.uid());

drop policy if exists roster_students_select_own on public.roster_students;
create policy roster_students_select_own on public.roster_students
for select to authenticated
using (professor_id = auth.uid());

drop policy if exists roster_students_insert_own on public.roster_students;
create policy roster_students_insert_own on public.roster_students
for insert to authenticated
with check (professor_id = auth.uid());

drop policy if exists roster_students_update_own on public.roster_students;
create policy roster_students_update_own on public.roster_students
for update to authenticated
using (professor_id = auth.uid())
with check (professor_id = auth.uid());

drop policy if exists subjects_insert_professor on public.subjects;
create policy subjects_insert_professor on public.subjects
for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'professor'
  )
);

drop policy if exists classes_insert_professor on public.classes;
create policy classes_insert_professor on public.classes
for insert to authenticated
with check (
  professor_id = auth.uid()
  and (
    academic_group_id is null
    or exists (
      select 1 from public.academic_groups group_row
      where group_row.id = academic_group_id
        and group_row.professor_id = auth.uid()
    )
  )
);

drop policy if exists classes_update_academic_group on public.classes;
create policy classes_update_academic_group on public.classes
for update to authenticated
using (professor_id = auth.uid())
with check (
  professor_id = auth.uid()
  and (
    academic_group_id is null
    or exists (
      select 1 from public.academic_groups group_row
      where group_row.id = academic_group_id
        and group_row.professor_id = auth.uid()
    )
  )
);

drop policy if exists enrollments_insert_roster on public.enrollments;
create policy enrollments_insert_roster on public.enrollments
for insert to authenticated
with check (
  private.teaches_class(class_id)
  and roster_student_id is not null
  and exists (
    select 1 from public.roster_students student
    where student.id = roster_student_id
      and student.professor_id = auth.uid()
  )
);

revoke all on table public.academic_groups from anon, authenticated;
revoke all on table public.roster_students from anon, authenticated;

grant select on table public.academic_groups to authenticated;
grant insert (professor_id, name) on table public.academic_groups to authenticated;
grant update (name, updated_at) on table public.academic_groups to authenticated;

grant select on table public.roster_students to authenticated;
grant insert (professor_id, full_name, registration_code) on table public.roster_students to authenticated;
grant update (full_name, registration_code) on table public.roster_students to authenticated;

grant insert (name, program, created_by) on table public.subjects to authenticated;
grant insert (subject_id, professor_id, period, schedule, room, academic_group_id)
  on table public.classes to authenticated;
grant update (academic_group_id, updated_at) on table public.classes to authenticated;
grant insert (class_id, roster_student_id) on table public.enrollments to authenticated;

COMMIT;