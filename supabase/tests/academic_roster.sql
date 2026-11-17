-- Teste local da turma acadêmica e do cadastro de alunos sem conta.
-- Não executar no projeto Supabase compartilhado.
-- O banco descartável precisa já ter as quatro migrações, inclusive esta.
-- A transação cria usuários temporários e desfaz tudo no ROLLBACK.

begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '71717171-7171-4171-8171-717171717171',
    'authenticated', 'authenticated', 'roster.professor.local@example.com', '', now(),
    '{"provider":"email","providers":["email"],"role":"professor"}'::jsonb,
    '{"full_name":"Professor da turma"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '72727272-7272-4272-8272-727272727272',
    'authenticated', 'authenticated', 'roster.outro.professor.local@example.com', '', now(),
    '{"provider":"email","providers":["email"],"role":"professor"}'::jsonb,
    '{"full_name":"Outro professor"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '73737373-7373-4373-8373-737373737373',
    'authenticated', 'authenticated', 'roster.aluno.antigo.local@example.com', '', now(),
    '{"provider":"email","providers":["email"],"role":"aluno"}'::jsonb,
    '{"full_name":"Aluno com conta antiga"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.academic_groups (id, professor_id, name) values
  ('74747474-7474-4474-8474-747474747474', '71717171-7171-4171-8171-717171717171', '5º Período'),
  ('75757575-7575-4575-8575-757575757575', '71717171-7171-4171-8171-717171717171', '6º Período');

insert into public.subjects (id, name, program, created_by) values
  ('76767676-7676-4676-8676-767676767676', 'Programação de Aplicativos', 'ADS', '71717171-7171-4171-8171-717171717171'),
  ('77777777-7777-4777-8777-777777777777', 'Banco de Dados', 'ADS', '71717171-7171-4171-8171-717171717171'),
  ('78787878-7878-4787-8787-787878787878', 'Engenharia de Software', 'ADS', '71717171-7171-4171-8171-717171717171'),
  ('83838383-8383-4383-8383-838383838383', 'Disciplina do outro professor', 'ADS', '72727272-7272-4272-8272-727272727272');

insert into public.classes (
  id, subject_id, professor_id, period, schedule, room, academic_group_id
) values
  (
    '79797979-7979-4797-8797-797979797979',
    '76767676-7676-4676-8676-767676767676',
    '71717171-7171-4171-8171-717171717171',
    '2026.1', 'Segunda · 19:00', 'Sala 1',
    '74747474-7474-4474-8474-747474747474'
  ),
  (
    '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a7a',
    '77777777-7777-4777-8777-777777777777',
    '71717171-7171-4171-8171-717171717171',
    '2026.1', 'Quarta · 19:00', 'Sala 1',
    '74747474-7474-4474-8474-747474747474'
  ),
  (
    '7b7b7b7b-7b7b-47b7-87b7-7b7b7b7b7b7b',
    '78787878-7878-4787-8787-787878787878',
    '71717171-7171-4171-8171-717171717171',
    '2026.1', 'Sexta · 19:00', 'Sala 2',
    '75757575-7575-4575-8575-757575757575'
  ),
  (
    '84848484-8484-4484-8484-848484848484',
    '76767676-7676-4676-8676-767676767676',
    '71717171-7171-4171-8171-717171717171',
    '2026.1', 'Terça · 19:00', 'Sala 2',
    '75757575-7575-4575-8575-757575757575'
  ),
  (
    '82828282-8282-4282-8282-828282828282',
    '83838383-8383-4383-8383-838383838383',
    '72727272-7272-4272-8272-727272727272',
    '2026.1', 'Quinta · 19:00', 'Sala 3',
    null
  );

insert into public.roster_students (id, professor_id, full_name, registration_code) values
  ('7c7c7c7c-7c7c-47c7-87c7-7c7c7c7c7c7c', '71717171-7171-4171-8171-717171717171', 'João Pedro Silva', '202600123'),
  ('7d7d7d7d-7d7d-47d7-87d7-7d7d7d7d7d7d', '71717171-7171-4171-8171-717171717171', 'Maria Oliveira', '202600456'),
  ('7e7e7e7e-7e7e-47e7-87e7-7e7e7e7e7e7e', '71717171-7171-4171-8171-717171717171', 'Carlos Lima', '202600789');

insert into public.enrollments (class_id, roster_student_id) values
  ('79797979-7979-4797-8797-797979797979', '7c7c7c7c-7c7c-47c7-87c7-7c7c7c7c7c7c'),
  ('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a7a', '7c7c7c7c-7c7c-47c7-87c7-7c7c7c7c7c7c'),
  ('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a7a', '7d7d7d7d-7d7d-47d7-87d7-7d7d7d7d7d7d'),
  ('79797979-7979-4797-8797-797979797979', '7e7e7e7e-7e7e-47e7-87e7-7e7e7e7e7e7e');

insert into public.enrollments (class_id, student_id) values
  ('79797979-7979-4797-8797-797979797979', '73737373-7373-4373-8373-737373737373');

do $$
begin
  if to_regclass('public.roster_students') is null
     or to_regclass('public.academic_groups') is null then
    raise exception 'tabelas novas ausentes';
  end if;

  if to_regprocedure('public.confirm_attendance(uuid, text)') is null then
    raise exception 'confirm_attendance ausente';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'class_sessions_one_academic_day'
  ) then
    raise exception 'índice de uma chamada por dia ausente';
  end if;

  if (select count(*) from public.academic_groups where professor_id = '71717171-7171-4171-8171-717171717171') <> 2 then
    raise exception 'turmas acadêmicas não foram criadas';
  end if;

  if (select count(*) from public.classes where academic_group_id = '74747474-7474-4474-8474-747474747474') <> 2 then
    raise exception 'o 5º período deveria ter duas disciplinas';
  end if;

  if (select count(*) from public.roster_students where id = '7c7c7c7c-7c7c-47c7-87c7-7c7c7c7c7c7c') <> 1 then
    raise exception 'o aluno foi duplicado no cadastro';
  end if;

  if (select count(*) from public.enrollments where roster_student_id = '7c7c7c7c-7c7c-47c7-87c7-7c7c7c7c7c7c') <> 2 then
    raise exception 'o mesmo aluno deveria participar de duas disciplinas';
  end if;

  if (select count(*) from public.enrollments where roster_student_id = '7d7d7d7d-7d7d-47d7-87d7-7d7d7d7d7d7d') <> 1
     or (select count(*) from public.enrollments where roster_student_id = '7e7e7e7e-7e7e-47e7-87e7-7e7e7e7e7e7e') <> 1 then
    raise exception 'matrícula individual incorreta';
  end if;

  if not exists (
    select 1 from public.enrollments
    where class_id = '79797979-7979-4797-8797-797979797979'
      and student_id = '73737373-7373-4373-8373-737373737373'
      and roster_student_id is null
  ) then
    raise exception 'a matrícula antiga não foi preservada';
  end if;
end $$;

do $$
begin
  insert into public.enrollments (class_id, roster_student_id) values
    ('79797979-7979-4797-8797-797979797979', '7c7c7c7c-7c7c-47c7-87c7-7c7c7c7c7c7c');
  raise exception 'matrícula duplicada foi aceita';
exception
  when unique_violation then
    null;
end $$;

do $$
begin
  insert into public.roster_students (professor_id, full_name, registration_code) values
    ('71717171-7171-4171-8171-717171717171', 'Outro João', ' 202600123 ');
  raise exception 'matrícula repetida do mesmo professor foi aceita';
exception
  when unique_violation then
    null;
end $$;

insert into public.roster_students (professor_id, full_name, registration_code) values
  ('72727272-7272-4272-8272-727272727272', 'João de outro professor', '202600123');

do $$
begin
  insert into public.roster_students (professor_id, full_name, registration_code) values
    ('71717171-7171-4171-8171-717171717171', '   ', '202699999');
  raise exception 'nome vazio foi aceito';
exception
  when check_violation then
    null;
end $$;

do $$
begin
  begin
    insert into public.enrollments (class_id, student_id, roster_student_id) values
      (
        '79797979-7979-4797-8797-797979797979',
        '73737373-7373-4373-8373-737373737373',
        '7c7c7c7c-7c7c-47c7-87c7-7c7c7c7c7c7c'
      );
  exception
    when check_violation or raise_exception then
      return;
  end;
  raise exception 'matrícula com dois alunos foi aceita';
end $$;

do $$
begin
  begin
    insert into public.enrollments (class_id, roster_student_id) values
      ('82828282-8282-4282-8282-828282828282', '7c7c7c7c-7c7c-47c7-87c7-7c7c7c7c7c7c');
  exception
    when raise_exception then
      return;
  end;
  raise exception 'aluno vinculado à oferta de outro professor';
end $$;

do $$
begin
  insert into public.classes (
    subject_id, professor_id, period, schedule, room, academic_group_id
  ) values (
    '76767676-7676-4676-8676-767676767676',
    '71717171-7171-4171-8171-717171717171',
    '2026.1', 'Segunda · 21:00', 'Sala 9',
    '74747474-7474-4474-8474-747474747474'
  );
  raise exception 'a mesma disciplina foi duplicada na mesma turma e período';
exception
  when unique_violation then
    null;
end $$;

insert into public.class_sessions (id, class_id, starts_at, code_expires_at, status, code) values
  (
    '7f7f7f7f-7f7f-47f7-87f7-7f7f7f7f7f7f',
    '79797979-7979-4797-8797-797979797979',
    now() - interval '2 minutes',
    now() + interval '10 minutes',
    'aberta',
    '111111'
  ),
  (
    '81818181-8181-4181-8181-818181818181',
    '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a7a',
    now() - interval '2 minutes',
    now() + interval '10 minutes',
    'aberta',
    '222222'
  );

insert into public.attendance_records (session_id, roster_student_id, mark, recorded_by) values
  (
    '7f7f7f7f-7f7f-47f7-87f7-7f7f7f7f7f7f',
    '7c7c7c7c-7c7c-47c7-87c7-7c7c7c7c7c7c',
    'presente',
    '71717171-7171-4171-8171-717171717171'
  );

insert into public.attendance_records (session_id, student_id, mark, recorded_by) values
  (
    '7f7f7f7f-7f7f-47f7-87f7-7f7f7f7f7f7f',
    '73737373-7373-4373-8373-737373737373',
    'presente',
    '71717171-7171-4171-8171-717171717171'
  );

do $$
begin
  insert into public.attendance_records (session_id, roster_student_id, mark, recorded_by) values
    (
      '7f7f7f7f-7f7f-47f7-87f7-7f7f7f7f7f7f',
      '7c7c7c7c-7c7c-47c7-87c7-7c7c7c7c7c7c',
      'presente',
      '71717171-7171-4171-8171-717171717171'
    );
  raise exception 'presença duplicada do aluno sem conta foi aceita';
exception
  when unique_violation then
    null;
end $$;

do $$
begin
  if not exists (
    select 1 from public.attendance_records
    where session_id = '7f7f7f7f-7f7f-47f7-87f7-7f7f7f7f7f7f'
      and student_id = '73737373-7373-4373-8373-737373737373'
      and roster_student_id is null
      and mark = 'presente'
  ) then
    raise exception 'a presença antiga não foi preservada';
  end if;
end $$;

-- O dono da tabela encerra só para liberar o índice de chamada aberta.
-- A rejeição seguinte tem de vir do índice diário, que continua na oferta.
update public.class_sessions
set status = 'encerrada',
    ends_at = starts_at + interval '1 hour',
    code = null
where id = '7f7f7f7f-7f7f-47f7-87f7-7f7f7f7f7f7f';

do $$
begin
  insert into public.class_sessions (class_id, starts_at, code_expires_at, status, code) values
    (
      '79797979-7979-4797-8797-797979797979',
      now() - interval '1 minute',
      now() + interval '10 minutes',
      'aberta',
      '333333'
    );
  raise exception 'segunda chamada da mesma oferta no mesmo dia foi aceita';
exception
  when unique_violation then
    if sqlerrm not like '%class_sessions_one_academic_day%' then
      raise;
    end if;
end $$;

insert into public.class_sessions (id, class_id, starts_at, code_expires_at, status, code) values (
  '85858585-8585-4585-8585-858585858585',
  '79797979-7979-4797-8797-797979797979',
  now() + interval '1 day',
  now() + interval '1 day 10 minutes',
  'aberta',
  '444444'
);

do $$
declare
  result jsonb;
  roster_absences integer;
begin
  perform set_config('request.jwt.claim.sub', '72727272-7272-4272-8272-727272727272', true);
  perform set_config('request.jwt.claims', '{"sub":"72727272-7272-4272-8272-727272727272","role":"authenticated"}', true);
  execute 'set local role authenticated';

  result := public.close_class_session('81818181-8181-4181-8181-818181818181');
  if result ->> 'result' is distinct from 'indisponivel' then
    raise exception 'outro professor encerrou a chamada: %', result;
  end if;

  if exists (
    select 1 from public.roster_students
    where professor_id is distinct from auth.uid()
  ) or (select count(*) from public.roster_students) is distinct from 1 then
    raise exception 'professor leu alunos de outro professor';
  end if;

  update public.roster_students
  set full_name = 'Nome invadido'
  where id = '7c7c7c7c-7c7c-47c7-87c7-7c7c7c7c7c7c';
  if found then
    raise exception 'professor alterou aluno de outro professor';
  end if;

  begin
    insert into public.roster_students (professor_id, full_name, registration_code) values
      ('71717171-7171-4171-8171-717171717171', 'Cadastro invadido', '202611111');
    raise exception 'professor criou aluno para outro professor';
  exception
    when insufficient_privilege then
      null;
    when raise_exception then
      if sqlerrm = 'professor criou aluno para outro professor' then
        raise;
      end if;
  end;

  insert into public.roster_students (professor_id, full_name, registration_code) values
    ('72727272-7272-4272-8272-727272727272', 'Aluno próprio', '202600456');

  perform set_config('request.jwt.claim.sub', '71717171-7171-4171-8171-717171717171', true);
  perform set_config('request.jwt.claims', '{"sub":"71717171-7171-4171-8171-717171717171","role":"authenticated"}', true);

  if (select count(*) from public.roster_students where registration_code = '202600456' and full_name = 'Aluno próprio') <> 0 then
    raise exception 'professor leu aluno de outro professor';
  end if;

  result := public.close_class_session('81818181-8181-4181-8181-818181818181');
  if (result ->> 'ok')::boolean is distinct from true
     or result ->> 'result' is distinct from 'encerrada'
     or (result ->> 'absent')::integer is distinct from 2 then
    raise exception 'encerramento dos alunos sem conta falhou: %', result;
  end if;

  select count(*) into roster_absences
  from public.attendance_records
  where session_id = '81818181-8181-4181-8181-818181818181'
    and student_id is null
    and roster_student_id is not null
    and mark = 'falta';

  if roster_absences is distinct from 2 then
    raise exception 'faltas do cadastro novo: %', roster_absences;
  end if;

  if exists (
    select 1 from public.attendance_records
    where session_id = '81818181-8181-4181-8181-818181818181'
      and roster_student_id = '7e7e7e7e-7e7e-47e7-87e7-7e7e7e7e7e7e'
  ) then
    raise exception 'aluno de outra disciplina recebeu falta nesta chamada';
  end if;

  execute 'reset role';
end $$;

do $$
begin
  execute 'set local role anon';
  if exists (select 1 from public.roster_students)
     or exists (select 1 from public.academic_groups) then
    raise exception 'acesso anônimo leu cadastros';
  end if;
  execute 'reset role';
exception
  when insufficient_privilege then
    execute 'reset role';
end $$;

rollback;
