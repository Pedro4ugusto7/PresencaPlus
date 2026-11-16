-- DADOS ACADÊMICOS DEMONSTRATIVOS.
-- Não cria usuários, não grava senhas e não lê credenciais.
-- Rode somente depois que já existirem perfis reais de professor e aluno.
-- Se não houver os dois perfis, o script não insere nada.

do $$
declare
  professor_id uuid;
  subject_main uuid;
  subject_secondary uuid;
  class_main uuid;
  class_secondary uuid;
  closed_session uuid;
  student record;
  student_count integer := 0;
begin
  if exists (
    select 1 from public.subjects where name = 'Desenvolvimento de Sistemas (demonstração)'
  ) then
    raise notice 'Os dados acadêmicos demonstrativos já existem. Nada foi alterado.';
    return;
  end if;

  select id into professor_id
  from public.profiles
  where role = 'professor'
  order by created_at
  limit 1;

  if professor_id is null or not exists (select 1 from public.profiles where role = 'aluno') then
    raise notice 'Crie antes um perfil de professor e outro de aluno. Nenhum usuário foi criado.';
    return;
  end if;

  insert into public.subjects (name, program)
  values ('Desenvolvimento de Sistemas (demonstração)', 'ADS')
  returning id into subject_main;

  insert into public.subjects (name, program)
  values ('Banco de Dados (demonstração)', 'ADS')
  returning id into subject_secondary;

  insert into public.classes (subject_id, professor_id, period, schedule, room)
  values (
    subject_main,
    professor_id,
    '3º período',
    'Segunda e quarta · 19:00–20:40',
    'Laboratório 2'
  )
  returning id into class_main;

  insert into public.classes (subject_id, professor_id, period, schedule, room)
  values (
    subject_secondary,
    professor_id,
    '3º período',
    'Terça e quinta · 19:00–20:40',
    'Sala 12'
  )
  returning id into class_secondary;

  for student in
    select id from public.profiles where role = 'aluno' order by created_at limit 30
  loop
    insert into public.enrollments (class_id, student_id) values (class_main, student.id);
    insert into public.enrollments (class_id, student_id) values (class_secondary, student.id);
    student_count := student_count + 1;
  end loop;

  insert into public.class_sessions (class_id, starts_at, ends_at, code_expires_at, status, code)
  values (class_main, now() - interval '7 days', now() - interval '7 days' + interval '100 minutes', now() - interval '7 days' + interval '15 minutes', 'encerrada', null)
  returning id into closed_session;

  insert into public.attendance_records (session_id, student_id, mark, recorded_at, recorded_by)
  select
    closed_session,
    e.student_id,
    case when row_number() over (order by p.full_name) = 1 then 'falta'::public.attendance_mark else 'presente'::public.attendance_mark end,
    now() - interval '7 days',
    professor_id
  from public.enrollments e
  join public.profiles p on p.id = e.student_id
  where e.class_id = class_main;

  insert into public.class_sessions (class_id, starts_at, ends_at, code_expires_at, status, code)
  values (class_main, now(), null, now() + interval '15 minutes', 'aberta', '482917');

  raise notice 'Dados acadêmicos demonstrativos criados para % aluno(s). Nenhum usuário foi criado.', student_count;
end $$;
