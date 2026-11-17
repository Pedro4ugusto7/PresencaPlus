import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/app-text';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { createAcademicGroup, loadAcademicCatalog } from '@/data/remote/academic-admin';
import { toHref } from '@/navigation/area-paths';

export function AcademicGroupsScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState();
  const [groups, setGroups] = useState([]);
  const [offerings, setOfferings] = useState([]);
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
    setGroups(result.groups);
    setOfferings(result.offerings);
  }, []);

  useFocusEffect(useCallback(() => {
    void reload();
  }, [reload]));

  async function save() {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 80) {
      setNameError('Informe um nome de até 80 caracteres.');
      return;
    }
    setNameError(undefined);
    setSaving(true);
    const result = await createAcademicGroup(trimmed);
    setSaving(false);
    setNotice(result.message);
    setNoticeTone(result.ok ? 'success' : 'warning');
    if (!result.ok) return;
    setName('');
    await reload();
  }

  return <Screen tone="brand" title="Turmas acadêmicas" subtitle="Exemplo: 5º Período" onBack={() => router.back()} keyboard>
      <TextField label="Nome da turma" value={name} onChangeText={setName} placeholder="5º Período" maxLength={80} error={nameError} />
      <Button label={saving ? 'Salvando…' : 'Cadastrar turma'} onPress={() => void save()} disabled={saving} />
      {notice ? <Notice message={notice} tone={noticeTone} /> : null}
      {loading ? <LoadingState message="Carregando turmas…" /> : groups.length === 0 ? <EmptyState icon="classes" title="Nenhuma turma cadastrada" description="Cadastre a primeira turma acadêmica para associar disciplinas." /> : groups.map(group => {
        const names = offerings.filter(item => item.groupId === group.id).map(item => item.subjectName);
        return <Card key={group.id} accessibilityLabel={group.name} onPress={() => router.push(toHref('/professor/gestao/turmas/[grupoId]', { grupoId: group.id }))}>
            <AppText size="heading">{group.name}</AppText>
            <AppText size="label" tone="muted">
              {names.length ? names.join(' · ') : 'Nenhuma disciplina nesta turma'}
            </AppText>
          </Card>;
      })}
    </Screen>;
}
