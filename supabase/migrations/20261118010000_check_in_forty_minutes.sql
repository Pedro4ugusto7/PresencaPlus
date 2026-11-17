-- O QR Code público passa a poder valer 40 minutos.
-- Não altera chamadas já gravadas e não reabre chamada encerrada.
-- A coluna code e a função session_code permanecem: o gatilho de inserção
-- ainda exige um código interno de 6 dígitos. O aplicativo não o exibe.
-- Execute este arquivo uma única vez, depois da migração do QR público.

begin;

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

commit;
