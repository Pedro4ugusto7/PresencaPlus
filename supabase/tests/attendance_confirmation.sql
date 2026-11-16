-- Teste local da confirmação de presença.
-- Não executar no projeto Supabase compartilhado.
-- O banco descartável precisa já ter a migração inicial.
-- A transação cria usuários temporários e desfaz tudo no ROLLBACK.

begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '51515151-5151-4151-8151-515151515151',
    'authenticated', 'authenticated', 'chamada.professor.local@example.com', '', now(),
    '{"provider":"email","providers":["email"],"role":"professor"}'::jsonb,
    '{"full_name":"Professor da chamada"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '52525252-5252-4252-8252-525252525252',
    'authenticated', 'authenticated', 'chamada.outro.professor.local@example.com', '', now(),
    '{"provider":"email","providers":["email"],"role":"professor"}'::jsonb,
    '{"full_name":"Outro professor"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '53535353-5353-4353-8353-535353535353',
    'authenticated', 'authenticated', 'chamada.aluno.local@example.com', '', now(),
    '{"provider":"email","providers":["email"],"role":"aluno"}'::jsonb,
    '{"full_name":"Aluno da chamada"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '54545454-5454-4454-8454-545454545454',
    'authenticated', 'authenticated', 'chamada.outra.aluna.local@example.com', '', now(),
    '{"provider":"email","providers":["email"],"role":"aluno"}'::jsonb,
    '{"full_name":"Aluna sem matrícula"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.subjects (id, name, program)
values ('56565656-5656-4566-8566-565656565656', 'Chamada local', 'ADS');

insert into public.classes (id, subject_id, professor_id, period, schedule, room)
values
  (
    '57575757-5757-4577-8577-575757575757',
    '56565656-5656-4566-8566-565656565656',
    '51515151-5151-4151-8151-515151515151',
    '2026.1', 'Segunda · 19:00', 'Sala 1'
  ),
  (
    '58585858-5858-4588-8588-585858585858',
    '56565656-5656-4566-8566-565656565656',
    '52525252-5252-4252-8252-525252525252',
    '2026.1', 'Terça · 19:00', 'Sala 2'
  );

insert into public.enrollments (class_id, student_id) values
  ('57575757-5757-4577-8577-575757575757', '53535353-5353-4353-8353-535353535353');

insert into public.class_sessions (id, class_id, starts_at, ends_at, code_expires_at, status, code)
values (
  '59595959-5959-4599-8599-595959595959',
  '57575757-5757-4577-8577-575757575757',
  now(),
  null,
  now() + interval '15 minutes',
  'aberta',
  '246810'
);

do $$
declare
  result jsonb;
  changed integer;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '53535353-5353-4353-8353-535353535353', true);
  perform set_config('request.jwt.claims', '{"sub":"53535353-5353-4353-8353-535353535353","role":"authenticated"}', true);

  result := public.confirm_attendance('59595959-5959-4599-8599-595959595959', '000000');
  if result->>'result' is distinct from 'codigo_invalido' or result->>'ok' = 'true' then
    raise exception 'FALHA: código divergente foi aceito: %', result;
  end if;

  result := public.confirm_attendance('59595959-5959-4599-8599-595959595959', '246810');
  if result->>'result' is distinct from 'presente' or result->>'ok' is distinct from 'true' then
    raise exception 'FALHA: presença válida não foi confirmada: %', result;
  end if;

  if (
    select count(*)
    from public.attendance_records
    where session_id = '59595959-5959-4599-8599-595959595959'
      and student_id = '53535353-5353-4353-8353-535353535353'
      and mark = 'presente'
  ) <> 1 then
    raise exception 'FALHA: a presença confirmada não ficou registrada';
  end if;

  result := public.confirm_attendance('59595959-5959-4599-8599-595959595959', '246810');
  if result->>'result' is distinct from 'duplicada' or result->>'ok' = 'true' then
    raise exception 'FALHA: presença duplicada foi aceita: %', result;
  end if;

  begin
    insert into public.attendance_records (session_id, student_id, mark, recorded_by)
    values (
      '59595959-5959-4599-8599-595959595959',
      '54545454-5454-4454-8454-545454545454',
      'presente',
      '53535353-5353-4353-8353-535353535353'
    );
    raise exception 'FALHA: aluno inseriu frequência diretamente';
  exception
    when insufficient_privilege then
      null;
    when raise_exception then
      if sqlerrm = 'FALHA: aluno inseriu frequência diretamente' then
        raise;
      end if;
  end;

  update public.attendance_records
  set mark = 'falta'
  where session_id = '59595959-5959-4599-8599-595959595959'
    and student_id = auth.uid();
  get diagnostics changed = row_count;
  if changed <> 0 then
    raise exception 'FALHA: aluno alterou a própria frequência';
  end if;

  perform set_config('request.jwt.claim.sub', '54545454-5454-4454-8454-545454545454', true);
  perform set_config('request.jwt.claims', '{"sub":"54545454-5454-4454-8454-545454545454","role":"authenticated"}', true);
  result := public.confirm_attendance('59595959-5959-4599-8599-595959595959', '246810');
  if result->>'result' is distinct from 'sem_matricula' then
    raise exception 'FALHA: aluno sem matrícula confirmou presença: %', result;
  end if;

  perform set_config('request.jwt.claim.sub', '52525252-5252-4252-8252-525252525252', true);
  perform set_config('request.jwt.claims', '{"sub":"52525252-5252-4252-8252-525252525252","role":"authenticated"}', true);
  result := public.close_class_session('59595959-5959-4599-8599-595959595959');
  if result->>'result' is distinct from 'indisponivel' then
    raise exception 'FALHA: professor encerrou chamada de outra turma: %', result;
  end if;

  perform set_config('request.jwt.claim.sub', '51515151-5151-4151-8151-515151515151', true);
  perform set_config('request.jwt.claims', '{"sub":"51515151-5151-4151-8151-515151515151","role":"authenticated"}', true);
  result := public.close_class_session('59595959-5959-4599-8599-595959595959');
  if result->>'result' is distinct from 'encerrada' or result->>'ok' is distinct from 'true' then
    raise exception 'FALHA: professor não encerrou a própria chamada: %', result;
  end if;
  if (result->>'present')::integer <> 1 or (result->>'absent')::integer <> 0 then
    raise exception 'FALHA: totais do encerramento divergiram: %', result;
  end if;
  if (
    select status
    from public.class_sessions
    where id = '59595959-5959-4599-8599-595959595959'
  ) is distinct from 'encerrada' then
    raise exception 'FALHA: a chamada continuou aberta';
  end if;

  perform set_config('request.jwt.claim.sub', '53535353-5353-4353-8353-535353535353', true);
  perform set_config('request.jwt.claims', '{"sub":"53535353-5353-4353-8353-535353535353","role":"authenticated"}', true);
  result := public.confirm_attendance('59595959-5959-4599-8599-595959595959', '246810');
  if result->>'result' is distinct from 'encerrada' then
    raise exception 'FALHA: chamada encerrada ainda aceitou presença: %', result;
  end if;
end $$;

select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '', true);

insert into public.enrollments (class_id, student_id)
values ('57575757-5757-4577-8577-575757575757', '54545454-5454-4454-8454-545454545454');

insert into public.class_sessions (id, class_id, starts_at, ends_at, code_expires_at, status, code)
values (
  '5a5a5a5a-5a5a-45aa-85aa-5a5a5a5a5a5a',
  '57575757-5757-4577-8577-575757575757',
  now() - interval '20 minutes',
  null,
  now() - interval '5 minutes',
  'aberta',
  '135790'
);

do $$
declare
  result jsonb;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '53535353-5353-4353-8353-535353535353', true);
  perform set_config('request.jwt.claims', '{"sub":"53535353-5353-4353-8353-535353535353","role":"authenticated"}', true);
  result := public.confirm_attendance('5a5a5a5a-5a5a-45aa-85aa-5a5a5a5a5a5a', '135790');
  if result->>'result' is distinct from 'expirada' then
    raise exception 'FALHA: código expirado foi aceito: %', result;
  end if;

  perform set_config('request.jwt.claim.sub', '51515151-5151-4151-8151-515151515151', true);
  perform set_config('request.jwt.claims', '{"sub":"51515151-5151-4151-8151-515151515151","role":"authenticated"}', true);
  result := public.close_class_session('5a5a5a5a-5a5a-45aa-85aa-5a5a5a5a5a5a');
  if result->>'result' is distinct from 'encerrada' then
    raise exception 'FALHA: chamada expirada não foi encerrada: %', result;
  end if;
  if (
    select count(*)
    from public.attendance_records
    where session_id = '5a5a5a5a-5a5a-45aa-85aa-5a5a5a5a5a5a'
      and mark = 'falta'
  ) <> 2 then
    raise exception 'FALHA: o encerramento não registrou as faltas de quem não confirmou';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '', true);

insert into public.class_sessions (id, class_id, starts_at, ends_at, code_expires_at, status, code)
values
  (
    '5b5b5b5b-5b5b-45bb-85bb-5b5b5b5b5b5b',
    '57575757-5757-4577-8577-575757575757',
    now() - interval '5 hours',
    null,
    now() - interval '5 hours' + interval '15 minutes',
    'aberta',
    '864200'
  ),
  (
    '5d5d5d5d-5d5d-45dd-85dd-5d5d5d5d5d5d',
    '58585858-5858-4588-8588-585858585858',
    now() + interval '5 minutes',
    null,
    now() + interval '20 minutes',
    'aberta',
    '975310'
  );

do $$
declare
  result jsonb;
  started timestamptz;
  finished timestamptz;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '51515151-5151-4151-8151-515151515151', true);
  perform set_config('request.jwt.claims', '{"sub":"51515151-5151-4151-8151-515151515151","role":"authenticated"}', true);

  select starts_at into started
  from public.class_sessions
  where id = '5b5b5b5b-5b5b-45bb-85bb-5b5b5b5b5b5b';

  result := public.close_class_session('5b5b5b5b-5b5b-45bb-85bb-5b5b5b5b5b5b');
  if result->>'result' is distinct from 'encerrada' or result->>'ok' is distinct from 'true' then
    raise exception 'FALHA: chamada acima de quatro horas não foi encerrada: %', result;
  end if;

  select ends_at into finished
  from public.class_sessions
  where id = '5b5b5b5b-5b5b-45bb-85bb-5b5b5b5b5b5b'
    and status = 'encerrada';

  if finished is distinct from started + interval '4 hours' then
    raise exception 'FALHA: o término ultrapassou as quatro horas: %', finished;
  end if;
  if (
    select count(*)
    from public.attendance_records
    where session_id = '5b5b5b5b-5b5b-45bb-85bb-5b5b5b5b5b5b'
      and mark = 'falta'
  ) <> 2 then
    raise exception 'FALHA: a chamada longa não registrou as faltas no encerramento';
  end if;

  perform set_config('request.jwt.claim.sub', '52525252-5252-4252-8252-525252525252', true);
  perform set_config('request.jwt.claims', '{"sub":"52525252-5252-4252-8252-525252525252","role":"authenticated"}', true);
  result := public.close_class_session('5d5d5d5d-5d5d-45dd-85dd-5d5d5d5d5d5d');
  if result->>'result' is distinct from 'horario_invalido' or result->>'ok' = 'true' then
    raise exception 'FALHA: chamada sem término válido foi encerrada: %', result;
  end if;
  if exists (
    select 1
    from public.attendance_records
    where session_id = '5d5d5d5d-5d5d-45dd-85dd-5d5d5d5d5d5d'
  ) or exists (
    select 1
    from public.class_sessions
    where id = '5d5d5d5d-5d5d-45dd-85dd-5d5d5d5d5d5d'
      and (status is distinct from 'aberta' or ends_at is not null or code is distinct from '975310')
  ) then
    raise exception 'FALHA: horário inválido gravou falta ou encerrou a chamada';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '', true);

insert into public.class_sessions (id, class_id, starts_at, ends_at, code_expires_at, status, code)
values (
  '5c5c5c5c-5c5c-45cc-85cc-5c5c5c5c5c5c',
  '57575757-5757-4577-8577-575757575757',
  now() + interval '2 minutes',
  null,
  now() + interval '17 minutes',
  'aberta',
  '192837'
);

do $$
declare
  result jsonb;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '51515151-5151-4151-8151-515151515151', true);
  perform set_config('request.jwt.claims', '{"sub":"51515151-5151-4151-8151-515151515151","role":"authenticated"}', true);
  result := public.close_class_session('5c5c5c5c-5c5c-45cc-85cc-5c5c5c5c5c5c');
  if result->>'result' is distinct from 'futura' or result->>'ok' = 'true' then
    raise exception 'FALHA: chamada com início no futuro foi encerrada: %', result;
  end if;
  if exists (
    select 1
    from public.attendance_records
    where session_id = '5c5c5c5c-5c5c-45cc-85cc-5c5c5c5c5c5c'
  ) or exists (
    select 1
    from public.class_sessions
    where id = '5c5c5c5c-5c5c-45cc-85cc-5c5c5c5c5c5c'
      and (status is distinct from 'aberta' or ends_at is not null or code is distinct from '192837')
  ) then
    raise exception 'FALHA: início futuro gravou falta ou encerrou a chamada';
  end if;
end $$;

do $$
begin
  set local role anon;
  perform public.confirm_attendance('59595959-5959-4599-8599-595959595959', '246810');
  raise exception 'FALHA: visitante executou a confirmação';
exception
  when insufficient_privilege then
    null;
  when raise_exception then
    if sqlerrm = 'FALHA: visitante executou a confirmação' then
      raise;
    end if;
end $$;

rollback;
