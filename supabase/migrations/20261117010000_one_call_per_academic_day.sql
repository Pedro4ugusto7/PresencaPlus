-- Uma chamada por turma em cada dia letivo.
-- O dia é a data de starts_at em America/Sao_Paulo, não current_date do servidor.
-- Não apaga, não encerra e não altera sessões já gravadas.
-- Se esta turma já tiver duas chamadas no mesmo dia acadêmico, o índice não é criado.
-- Consulte os conflitos antes, sem apagar linhas:
-- select class_id, (starts_at at time zone 'America/Sao_Paulo')::date as dia, count(*)
-- from public.class_sessions
-- group by 1, 2
-- having count(*) > 1;

create unique index if not exists class_sessions_one_academic_day
  on public.class_sessions (
    class_id,
    ((starts_at at time zone 'America/Sao_Paulo')::date)
  );
