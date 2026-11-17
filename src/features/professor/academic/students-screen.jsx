import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/app-text';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { TextField } from '@/components/ui/text-field';
import { matchesSearch } from '@/domain';
import { createRosterStudent, loadAcademicCatalog } from '@/data/remote/academic-admin';
import { toHref } from '@/navigation/area-paths';

export function AcademicStudentsScreen() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState('');
  const [fullName, setFullName] = useState('');
  const [registration, setRegistration] = useState('');
  const [formError, setFormError] = useState();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [noticeTone, setNoticeTone] = useState('warning');

  const reload = useCallback(async () => {
    setLoading(true);
    const result = await loadAcademicCatalog();
    setLoading(false);
    if (!result.ok) {
      setNotice(result.message);
      setNoticeTone('warning');
      return;
    }
    setStudents(result.students);
  }, []);

  useFocusEffect(useCallback(() => {
    void reload();
  }, [reload]));

  const visible = useMemo(() => students.filter(student => matchesSearch(query, student.full_name, student.registration_code)), [query, students]);

  async function save() {
    const name = fullName.trim();
    const code = registration.trim();
    if (name.length < 1 || name.length > 160 || code.length < 1 || code.length > 40) {
      setFormError('Informe o nome completo e a matrícula.');
      return;
    }
    setFormError(undefined);
    setSaving(true);
    const result = await createRosterStudent(name, code);
    setSaving(false);
    setNotice(result.message);
    setNoticeTone(result.ok ? 'success' : 'warning');
    if (!result.ok) return;
    setFullName('');
    setRegistration('');
    await reload();
  }

  return <Screen tone="brand" title="Alunos" subtitle="Cadastro desta conta, sem senha" onBack={() => router.back()} keyboard>
      <TextField label="Nome completo" value={fullName} onChangeText={setFullName} placeholder="João Pedro Silva" maxLength={160} error={formError} />
      <TextField label="Matrícula" value={registration} onChangeText={setRegistration} placeholder="202600123" autoCapitalize="none" maxLength={40} />
      <Button label={saving ? 'Salvando…' : 'Cadastrar aluno'} onPress={() => void save()} disabled={saving} />
      {notice ? <Notice message={notice} tone={noticeTone} /> : null}
      <SearchField value={query} onChangeText={setQuery} placeholder="Buscar nome ou matrícula" />
      {loading ? <LoadingState message="Carregando alunos…" /> : visible.length === 0 ? <EmptyState icon="profile" title="Nenhum aluno encontrado" description="Cadastre um aluno ou limpe a busca. A matrícula não se repete nesta conta." /> : visible.map(student => <Card key={student.id} accessibilityLabel={student.full_name} onPress={() => router.push(toHref('/professor/gestao/alunos/[alunoId]', { alunoId: student.id }))}>
          <AppText size="heading">{student.full_name}</AppText>
          <AppText size="label" tone="muted">Matrícula {student.registration_code}</AppText>
        </Card>)}
    </Screen>;
}
