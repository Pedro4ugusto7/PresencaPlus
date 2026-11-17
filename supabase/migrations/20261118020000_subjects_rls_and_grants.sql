-- Registra a correcao de permissoes e da politica RLS
-- aplicada no Supabase para o cadastro de disciplinas.

BEGIN;

GRANT INSERT ON TABLE
  public.subjects,
  public.classes,
  public.academic_groups
TO authenticated;

ALTER POLICY subjects_select_related
ON public.subjects
USING (
  created_by = auth.uid()
  OR private.can_read_subject(id)
);

COMMIT;