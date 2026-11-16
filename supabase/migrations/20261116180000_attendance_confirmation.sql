-- Presença+ — confirmação de presença pelo aluno e encerramento da chamada.
-- Migração nova. Não altera o arquivo da migração inicial.
-- Não apaga tabelas, não cria usuários e não grava senhas.

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
            and recorded.student_id = enrolled_student.student_id
        )
    ) then
      raise exception 'encerre a chamada somente depois de registrar quem não confirmou';
    end if;
    return new;
  end if;

  raise exception 'transição de chamada inválida';
end;
$$;

create or replace function public.confirm_attendance(target_session uuid, credential text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  student uuid := auth.uid();
  student_role public.user_role;
  session_status public.session_status;
  stored text;
  deadline timestamptz;
  class_ends timestamptz;
  target_class uuid;
  class_professor uuid;
  enrolled boolean;
begin
  if student is null then
    return jsonb_build_object('ok', false, 'result', 'autenticacao');
  end if;

  if credential is null or credential !~ '^[0-9]{6}$' then
    return jsonb_build_object('ok', false, 'result', 'codigo_invalido');
  end if;

  select role into student_role
  from public.profiles
  where id = student;

  if student_role is distinct from 'aluno' then
    return jsonb_build_object('ok', false, 'result', 'papel');
  end if;

  select s.status, s.code, s.code_expires_at, s.ends_at, s.class_id, c.professor_id
  into session_status, stored, deadline, class_ends, target_class, class_professor
  from public.class_sessions s
  join public.classes c on c.id = s.class_id
  where s.id = target_session
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'result', 'indisponivel');
  end if;

  if session_status is distinct from 'aberta' then
    return jsonb_build_object('ok', false, 'result', 'encerrada');
  end if;

  if deadline is null or deadline < pg_catalog.now()
    or (class_ends is not null and class_ends < pg_catalog.now())
  then
    return jsonb_build_object('ok', false, 'result', 'expirada');
  end if;

  if stored is null or stored <> credential then
    return jsonb_build_object('ok', false, 'result', 'codigo_invalido');
  end if;

  select exists (
    select 1
    from public.enrollments e
    where e.class_id = target_class
      and e.student_id = student
  ) into enrolled;

  if not enrolled then
    return jsonb_build_object('ok', false, 'result', 'sem_matricula');
  end if;

  if exists (
    select 1
    from public.attendance_records
    where session_id = target_session
      and student_id = student
  ) then
    return jsonb_build_object('ok', false, 'result', 'duplicada');
  end if;

  perform set_config('presenca.check_in', target_session::text, true);
  insert into public.attendance_records (session_id, student_id, mark, recorded_by)
  values (target_session, student, 'presente', class_professor);
  perform set_config('presenca.check_in', '', true);

  return jsonb_build_object('ok', true, 'result', 'presente');
exception
  when unique_violation then
    perform set_config('presenca.check_in', '', true);
    return jsonb_build_object('ok', false, 'result', 'duplicada');
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

  -- Início no futuro não produz término nem falta.
  -- A partir de cinco minutos à frente, nem o ajuste permitido cabe nas regras.
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
  insert into public.attendance_records (session_id, student_id, mark, recorded_by)
  select target_session, e.student_id, 'falta', teacher
  from public.enrollments e
  where e.class_id = target_class
    and not exists (
      select 1
      from public.attendance_records recorded
      where recorded.session_id = target_session
        and recorded.student_id = e.student_id
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

revoke all on function public.confirm_attendance(uuid, text) from public, anon;
revoke all on function public.close_class_session(uuid) from public, anon;
grant execute on function public.confirm_attendance(uuid, text) to authenticated;
grant execute on function public.close_class_session(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    revoke all on function public.confirm_attendance(uuid, text) from service_role;
    revoke all on function public.close_class_session(uuid) from service_role;
  end if;
end $$;
