-- Teste local de permissões e integridade do Presença+.
-- Não executar no projeto Supabase compartilhado.
-- Este arquivo não foi aplicado em um banco real nesta revisão.
-- A transação cria usuários temporários e desfaz tudo no ROLLBACK.
-- Um erro inesperado interrompe o script. Só a negação prevista é aceita.

begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111111',
    'authenticated', 'authenticated', 'professor.local@example.com', '', now(),
    '{"provider":"email","providers":["email"],"role":"professor"}'::jsonb,
    '{"full_name":"Professor Local"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-4222-8222-222222222222',
    'authenticated', 'authenticated', 'aluno.local@example.com', '', now(),
    '{"provider":"email","providers":["email"],"role":"aluno"}'::jsonb,
    '{"full_name":"Aluno Local"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-4333-8333-333333333333',
    'authenticated', 'authenticated', 'outro.professor.local@example.com', '', now(),
    '{"provider":"email","providers":["email"],"role":"professor"}'::jsonb,
    '{"full_name":"Outro Professor"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '44444444-4444-4444-8444-444444444444',
    'authenticated', 'authenticated', 'outra.aluna.local@example.com', '', now(),
    '{"provider":"email","providers":["email"],"role":"aluno"}'::jsonb,
    '{"full_name":"Outra Aluna"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.subjects (id, name, program)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Disciplina local', 'ADS');

insert into public.classes (id, subject_id, professor_id, period, schedule, room)
values
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    '2026.1', 'Segunda · 19:00', 'Sala 1'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    '2026.2', 'Quarta · 19:00', 'Sala 2'
  ),
  (
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '33333333-3333-4333-8333-333333333333',
    '2026.1', 'Terça · 19:00', 'Sala 3'
  );

insert into public.enrollments (class_id, student_id) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '44444444-4444-4444-8444-444444444444'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '22222222-2222-4222-8222-222222222222');

insert into public.class_sessions (id, class_id, starts_at, ends_at, code_expires_at, status, code) values
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    now() - interval '1 day',
    now() - interval '1 day' + interval '1 hour',
    now() - interval '1 day' + interval '15 minutes',
    'encerrada',
    null
  ),
  (
    '99999999-9999-4999-8999-999999999999',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    now(),
    null,
    now() + interval '15 minutes',
    'aberta',
    '482917'
  ),
  (
    '77777777-7777-4777-8777-777777777777',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    now() - interval '20 minutes',
    null,
    now() - interval '1 minute',
    'aberta',
    '111111'
  );

insert into public.attendance_records (id, session_id, student_id, mark, recorded_by) values
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '22222222-2222-4222-8222-222222222222',
    'falta',
    '11111111-1111-4111-8111-111111111111'
  ),
  (
    'abababab-abab-4aba-8aba-abababababab',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '44444444-4444-4444-8444-444444444444',
    'presente',
    '11111111-1111-4111-8111-111111111111'
  );

do $$
begin
  if has_table_privilege('anon', 'public.profiles', 'select')
    or has_table_privilege('anon', 'public.classes', 'select')
    or has_table_privilege('anon', 'public.attendance_records', 'select')
    or has_table_privilege('anon', 'public.absence_justifications', 'select')
  then
    raise exception 'FALHA: anon recebeu leitura acadêmica';
  end if;
  if has_function_privilege('authenticated', 'public.provision_profile(uuid)', 'execute') then
    raise exception 'FALHA: authenticated executa provision_profile';
  end if;
  if has_function_privilege('anon', 'public.session_code(uuid)', 'execute') then
    raise exception 'FALHA: anon executa session_code';
  end if;
  if not has_function_privilege('authenticated', 'public.session_code(uuid)', 'execute') then
    raise exception 'FALHA: o professor ficou sem o procedimento do código';
  end if;
  if has_function_privilege('anon', 'private.teaches_class(uuid)', 'execute')
    or has_function_privilege('authenticated', 'private.handle_new_user()', 'execute')
  then
    raise exception 'FALHA: função privilegiada exposta ao papel errado';
  end if;
  if not has_function_privilege('supabase_auth_admin', 'private.handle_new_user()', 'execute') then
    raise exception 'FALHA: o cadastro de perfil ficou sem o gatilho do Auth';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  changed integer;
begin
  if (select count(*) from public.classes) <> 2 then
    raise exception 'FALHA: aluno não ficou restrito às próprias turmas';
  end if;
  if (select count(*) from public.enrollments) <> 2
    or exists (select 1 from public.enrollments where student_id <> auth.uid())
  then
    raise exception 'FALHA: aluno leu matrícula alheia';
  end if;
  if (select count(*) from public.attendance_records) <> 1
    or (select mark::text from public.attendance_records) is distinct from 'falta'
  then
    raise exception 'FALHA: aluno não leu somente a própria frequência';
  end if;
  if exists (select 1 from public.profiles where id in (
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444'
  )) then
    raise exception 'FALHA: aluno leu perfil de terceiro';
  end if;
  if public.session_code('99999999-9999-4999-8999-999999999999') is not null then
    raise exception 'FALHA: aluno obteve o código da chamada';
  end if;

  update public.attendance_records
  set mark = 'presente'
  where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  get diagnostics changed = row_count;
  if changed <> 0 then
    raise exception 'FALHA: aluno alterou a própria frequência';
  end if;

  begin
    update public.profiles set role = 'professor' where id = auth.uid();
    raise exception 'FALHA: aluno alterou o próprio papel';
  exception
    when insufficient_privilege then
      null;
    when raise_exception then
      if sqlerrm = 'FALHA: aluno alterou o próprio papel' then
        raise;
      elsif sqlerrm is distinct from 'o perfil acadêmico não pode ser alterado por esta conta' then
        raise exception 'erro inesperado ao alterar o papel do aluno: %', sqlerrm;
      end if;
  end;

  begin
    perform public.provision_profile('22222222-2222-4222-8222-222222222222');
    raise exception 'FALHA: aluno executou provision_profile';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    perform code from public.class_sessions;
    raise exception 'FALHA: o código da chamada ficou visível';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    insert into public.absence_justifications (attendance_record_id, student_id, reason, status)
    values (
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      '22222222-2222-4222-8222-222222222222',
      'Atestado privilegiado',
      'aceita'
    );
    raise exception 'FALHA: aluno gravou justificativa já aceita';
  exception
    when insufficient_privilege then
      null;
    when raise_exception then
      if sqlerrm = 'FALHA: aluno gravou justificativa já aceita' then
        raise;
      elsif sqlerrm is distinct from 'somente uma falta pode receber justificativa pendente' then
        raise exception 'erro inesperado na justificativa privilegiada: %', sqlerrm;
      end if;
  end;

  begin
    insert into public.absence_justifications (attendance_record_id, student_id, reason)
    values (
      'abababab-abab-4aba-8aba-abababababab',
      '22222222-2222-4222-8222-222222222222',
      'Frequência de outra pessoa'
    );
    raise exception 'FALHA: aluno justificou frequência alheia';
  exception
    when insufficient_privilege then
      null;
    when raise_exception then
      if sqlerrm = 'FALHA: aluno justificou frequência alheia' then
        raise;
      elsif sqlerrm is distinct from 'a justificativa não pertence a este aluno' then
        raise exception 'erro inesperado na justificativa alheia: %', sqlerrm;
      end if;
  end;

  insert into public.absence_justifications (id, attendance_record_id, student_id, reason)
  values (
    '12121212-1212-4121-8121-121212121212',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    '22222222-2222-4222-8222-222222222222',
    'Atestado local'
  );
  if (select status::text from public.absence_justifications) is distinct from 'pendente' then
    raise exception 'FALHA: a justificativa válida não ficou pendente';
  end if;

  update public.absence_justifications
  set status = 'aceita'
  where id = '12121212-1212-4121-8121-121212121212';
  get diagnostics changed = row_count;
  if changed <> 0 then
    raise exception 'FALHA: aluno avaliou a própria justificativa';
  end if;
end $$;

reset role;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  changed integer;
begin
  if exists (select 1 from public.classes where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    or exists (select 1 from public.enrollments)
    or exists (select 1 from public.attendance_records)
    or exists (select 1 from public.absence_justifications)
  then
    raise exception 'FALHA: professor leu dados de turma alheia';
  end if;
  if public.session_code('99999999-9999-4999-8999-999999999999') is not null then
    raise exception 'FALHA: outro professor obteve o código da chamada';
  end if;

  update public.absence_justifications
  set status = 'recusada'
  where id = '12121212-1212-4121-8121-121212121212';
  get diagnostics changed = row_count;
  if changed <> 0 then
    raise exception 'FALHA: professor de outra turma alterou a justificativa';
  end if;

  begin
    insert into public.attendance_records (session_id, student_id, mark, recorded_by)
    values (
      '99999999-9999-4999-8999-999999999999',
      '22222222-2222-4222-8222-222222222222',
      'presente',
      '33333333-3333-4333-8333-333333333333'
    );
    raise exception 'FALHA: terceiro registrou frequência em turma alheia';
  exception
    when insufficient_privilege then
      null;
    when raise_exception then
      if sqlerrm = 'FALHA: terceiro registrou frequência em turma alheia' then
        raise;
      elsif sqlerrm not in (
        'sessão de chamada inválida',
        'somente o professor da turma registra a frequência'
      ) then
        raise exception 'erro inesperado de terceiro na frequência: %', sqlerrm;
      end if;
  end;
end $$;

reset role;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  changed integer;
begin
  if (select count(*) from public.classes) <> 2
    or exists (select 1 from public.classes where professor_id <> auth.uid())
  then
    raise exception 'FALHA: professor não ficou restrito às próprias turmas';
  end if;
  if (select count(*) from public.enrollments) <> 3 then
    raise exception 'FALHA: professor não leu as matrículas da própria turma';
  end if;
  if public.session_code('99999999-9999-4999-8999-999999999999') is distinct from '482917' then
    raise exception 'FALHA: professor não leu o código da própria chamada';
  end if;

  begin
    update public.profiles set role = 'aluno' where id = auth.uid();
    raise exception 'FALHA: professor alterou o próprio papel';
  exception
    when insufficient_privilege then
      null;
    when raise_exception then
      if sqlerrm = 'FALHA: professor alterou o próprio papel' then
        raise;
      elsif sqlerrm is distinct from 'o perfil acadêmico não pode ser alterado por esta conta' then
        raise exception 'erro inesperado ao alterar o papel do professor: %', sqlerrm;
      end if;
  end;

  begin
    insert into public.attendance_records (session_id, student_id, mark, recorded_by)
    values (
      '77777777-7777-4777-8777-777777777777',
      '22222222-2222-4222-8222-222222222222',
      'presente',
      '11111111-1111-4111-8111-111111111111'
    );
    raise exception 'FALHA: chamada com código vencido aceitou frequência';
  exception
    when raise_exception then
      if sqlerrm = 'FALHA: chamada com código vencido aceitou frequência' then
        raise;
      elsif sqlerrm is distinct from 'o código desta chamada não está mais válido' then
        raise exception 'erro inesperado na validade do código: %', sqlerrm;
      end if;
  end;

  update public.class_sessions
  set status = 'encerrada', ends_at = starts_at + interval '1 minute', code = null
  where id = '77777777-7777-4777-8777-777777777777';
  get diagnostics changed = row_count;
  if changed <> 1 then
    raise exception 'FALHA: professor não encerrou a chamada com código vencido';
  end if;

  begin
    insert into public.class_sessions (class_id, starts_at, status, code)
    values (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      now(),
      'aberta',
      '246801'
    );
    raise exception 'FALHA: chamada sem validade de código foi aberta';
  exception
    when raise_exception then
      if sqlerrm = 'FALHA: chamada sem validade de código foi aberta' then
        raise;
      elsif sqlerrm is distinct from 'a chamada aberta precisa de validade para o código' then
        raise exception 'erro inesperado ao abrir chamada sem validade: %', sqlerrm;
      end if;
  end;

  begin
    insert into public.class_sessions (class_id, starts_at, code_expires_at, status, code)
    values (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      now(),
      now() + interval '31 minutes',
      'aberta',
      '246801'
    );
    raise exception 'FALHA: o código ficou válido por mais de 30 minutos';
  exception
    when raise_exception then
      if sqlerrm = 'FALHA: o código ficou válido por mais de 30 minutos' then
        raise;
      elsif sqlerrm is distinct from 'a validade do código excede o período permitido' then
        raise exception 'erro inesperado no prazo do código: %', sqlerrm;
      end if;
  end;

  insert into public.class_sessions (id, class_id, starts_at, code_expires_at, status, code)
  values (
    '88888888-8888-4888-8888-888888888888',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    now(),
    now() + interval '15 minutes',
    'aberta',
    '135790'
  );
  if public.session_code('88888888-8888-4888-8888-888888888888') is distinct from '135790' then
    raise exception 'FALHA: a chamada aberta não guardou o código do professor';
  end if;

  begin
    insert into public.class_sessions (class_id, starts_at, code_expires_at, status, code)
    values (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      now(),
      now() + interval '15 minutes',
      'aberta',
      '246801'
    );
    raise exception 'FALHA: duas chamadas abertas foram aceitas na mesma turma';
  exception
    when unique_violation then
      null;
  end;

  begin
    update public.class_sessions
    set code = '000000'
    where id = '99999999-9999-4999-8999-999999999999';
    raise exception 'FALHA: o código da chamada foi adulterado';
  exception
    when raise_exception then
      if sqlerrm = 'FALHA: o código da chamada foi adulterado' then
        raise;
      elsif sqlerrm is distinct from 'o código da chamada não pode ser adulterado' then
        raise exception 'erro inesperado ao alterar o código: %', sqlerrm;
      end if;
  end;

  begin
    update public.class_sessions
    set class_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
    where id = '99999999-9999-4999-8999-999999999999';
    raise exception 'FALHA: a chamada mudou de turma';
  exception
    when insufficient_privilege then
      null;
    when raise_exception then
      if sqlerrm = 'FALHA: a chamada mudou de turma' then
        raise;
      elsif sqlerrm is distinct from 'a chamada não pode mudar de turma' then
        raise exception 'erro inesperado ao mover a chamada: %', sqlerrm;
      end if;
  end;

  insert into public.attendance_records (session_id, student_id, mark, recorded_by)
  values (
    '99999999-9999-4999-8999-999999999999',
    '22222222-2222-4222-8222-222222222222',
    'presente',
    '11111111-1111-4111-8111-111111111111'
  );
  if (select count(*) from public.attendance_records
      where session_id = '99999999-9999-4999-8999-999999999999') <> 1
  then
    raise exception 'FALHA: professor não registrou a frequência da própria turma';
  end if;

  begin
    insert into public.attendance_records (session_id, student_id, mark, recorded_by)
    values (
      '99999999-9999-4999-8999-999999999999',
      '22222222-2222-4222-8222-222222222222',
      'falta',
      '11111111-1111-4111-8111-111111111111'
    );
    raise exception 'FALHA: a frequência duplicada foi aceita';
  exception
    when unique_violation then
      null;
  end;

  begin
    insert into public.attendance_records (session_id, student_id, mark, recorded_by)
    values (
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      '22222222-2222-4222-8222-222222222222',
      'presente',
      '11111111-1111-4111-8111-111111111111'
    );
    raise exception 'FALHA: professor registrou frequência em chamada encerrada';
  exception
    when raise_exception then
      if sqlerrm = 'FALHA: professor registrou frequência em chamada encerrada' then
        raise;
      elsif sqlerrm is distinct from 'não é possível registrar frequência em chamada encerrada' then
        raise exception 'erro inesperado ao registrar em chamada encerrada: %', sqlerrm;
      end if;
  end;

  begin
    update public.attendance_records
    set mark = 'presente'
    where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    raise exception 'FALHA: a frequência encerrada foi alterada';
  exception
    when raise_exception then
      if sqlerrm = 'FALHA: a frequência encerrada foi alterada' then
        raise;
      elsif sqlerrm is distinct from 'a frequência de uma chamada encerrada não pode ser alterada' then
        raise exception 'erro inesperado na frequência encerrada: %', sqlerrm;
      end if;
  end;

  begin
    update public.class_sessions
    set status = 'encerrada', ends_at = starts_at + interval '5 hours', code = null
    where id = '88888888-8888-4888-8888-888888888888';
    raise exception 'FALHA: a aula passou de quatro horas';
  exception
    when raise_exception then
      if sqlerrm = 'FALHA: a aula passou de quatro horas' then
        raise;
      elsif sqlerrm is distinct from 'a duração da aula excede o período permitido' then
        raise exception 'erro inesperado na duração da aula: %', sqlerrm;
      end if;
  end;

  begin
    update public.class_sessions
    set status = 'encerrada',
        ends_at = starts_at + interval '1 minute',
        code_expires_at = starts_at + interval '5 minutes',
        code = null
    where id = '88888888-8888-4888-8888-888888888888';
    raise exception 'FALHA: o encerramento alterou a validade do código';
  exception
    when raise_exception then
      if sqlerrm = 'FALHA: o encerramento alterou a validade do código' then
        raise;
      elsif sqlerrm is distinct from 'a validade do código não pode ser alterada no encerramento' then
        raise exception 'erro inesperado ao encerrar a validade: %', sqlerrm;
      end if;
  end;

  update public.class_sessions
  set status = 'encerrada', ends_at = starts_at + interval '1 minute', code = null
  where id = '88888888-8888-4888-8888-888888888888';
  get diagnostics changed = row_count;
  if changed <> 1 then
    raise exception 'FALHA: professor não encerrou a própria chamada';
  end if;

  begin
    update public.class_sessions
    set status = 'aberta'
    where id = '88888888-8888-4888-8888-888888888888';
    raise exception 'FALHA: professor reabriu a chamada';
  exception
    when raise_exception then
      if sqlerrm = 'FALHA: professor reabriu a chamada' then
        raise;
      elsif sqlerrm is distinct from 'a chamada encerrada não pode ser reaberta nem alterada' then
        raise exception 'erro inesperado ao reabrir a chamada: %', sqlerrm;
      end if;
  end;

  update public.class_sessions
  set status = 'encerrada', ends_at = starts_at + interval '1 minute', code = null
  where id = '99999999-9999-4999-8999-999999999999';
  get diagnostics changed = row_count;
  if changed <> 1 then
    raise exception 'FALHA: professor não encerrou a chamada com frequência';
  end if;

  begin
    insert into public.attendance_records (session_id, student_id, mark, recorded_by)
    values (
      '99999999-9999-4999-8999-999999999999',
      '44444444-4444-4444-8444-444444444444',
      'presente',
      '11111111-1111-4111-8111-111111111111'
    );
    raise exception 'FALHA: a chamada recém-encerrada aceitou frequência';
  exception
    when raise_exception then
      if sqlerrm = 'FALHA: a chamada recém-encerrada aceitou frequência' then
        raise;
      elsif sqlerrm is distinct from 'não é possível registrar frequência em chamada encerrada' then
        raise exception 'erro inesperado após o encerramento: %', sqlerrm;
      end if;
  end;

  update public.absence_justifications
  set status = 'aceita'
  where id = '12121212-1212-4121-8121-121212121212';
  get diagnostics changed = row_count;
  if changed <> 1 then
    raise exception 'FALHA: professor responsável não avaliou a justificativa';
  end if;
  if (select mark::text from public.attendance_records where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd')
    is distinct from 'justificada'
  then
    raise exception 'FALHA: aceitar a justificativa não marcou a falta como justificada';
  end if;
end $$;

reset role;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  changed integer;
begin
  update public.absence_justifications
  set status = 'recusada'
  where id = '12121212-1212-4121-8121-121212121212';
  get diagnostics changed = row_count;
  if changed <> 0 then
    raise exception 'FALHA: professor de outra turma alterou a justificativa avaliada';
  end if;
end $$;

reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '', true);
set local role anon;

do $$
begin
  begin
    perform count(*) from public.profiles;
    raise exception 'FALHA: anon leu perfis acadêmicos';
  exception
    when insufficient_privilege then
      null;
  end;
  begin
    perform count(*) from public.class_sessions;
    raise exception 'FALHA: anon leu chamadas';
  exception
    when insufficient_privilege then
      null;
  end;
  begin
    perform public.session_code('99999999-9999-4999-8999-999999999999');
    raise exception 'FALHA: anon leu o código da chamada';
  exception
    when insufficient_privilege then
      null;
  end;
end $$;

reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '', true);

do $$
begin
  if (select role::text from public.profiles where id = '22222222-2222-4222-8222-222222222222') <> 'aluno'
    or (select role::text from public.profiles where id = '11111111-1111-4111-8111-111111111111') <> 'professor'
  then
    raise exception 'FALHA: um papel privilegiado foi modificado';
  end if;
  if (select class_id from public.class_sessions where id = '99999999-9999-4999-8999-999999999999')
      <> 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    or (select status::text from public.class_sessions where id = '99999999-9999-4999-8999-999999999999') <> 'encerrada'
    or (select status::text from public.class_sessions where id = '88888888-8888-4888-8888-888888888888') <> 'encerrada'
    or (select status::text from public.class_sessions where id = '77777777-7777-4777-8777-777777777777') <> 'encerrada'
    or (select code from public.class_sessions where id = '99999999-9999-4999-8999-999999999999') is not null
    or (select code_expires_at from public.class_sessions where id = '99999999-9999-4999-8999-999999999999')
      is distinct from (
        select starts_at + interval '15 minutes'
        from public.class_sessions
        where id = '99999999-9999-4999-8999-999999999999'
      )
  then
    raise exception 'FALHA: o histórico da chamada foi adulterado';
  end if;
  if (select mark::text from public.attendance_records where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd') <> 'justificada'
    or (select mark::text from public.attendance_records where id = 'abababab-abab-4aba-8aba-abababababab') <> 'presente'
    or (select status::text from public.absence_justifications where id = '12121212-1212-4121-8121-121212121212') <> 'aceita'
    or (select count(*) from public.attendance_records where session_id = '99999999-9999-4999-8999-999999999999') <> 1
  then
    raise exception 'FALHA: a frequência ou a justificativa perdeu a integridade';
  end if;
end $$;

rollback;
