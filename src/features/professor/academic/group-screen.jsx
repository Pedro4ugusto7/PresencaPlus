import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { AppText } from '@/components/ui/app-text';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { createOffering, createSubject, loadAcademicCatalog, renameAcademicGroup } from '@/data/remote/academic-admin';
import { spacing } from '@/theme';

function firstParam(value) {
  return typeof value === 'string' ? value : '';
}

export function AcademicGroupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const groupId = firstParam(params.grupoId);
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('');
  const [subjectId, setSubjectId] = useState(null);
  const [newName, setNewName] = useState('');
  const [program, setProgram] = useState('');
  const [period, setPeriod] = useState('');
  const [schedule, setSchedule] = useState('');
  const [room, setRoom] = useState('');
  const [nameError, setNameError] = useState();
  const [offerError, setOfferError] = useState();
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
    setCatalog(result);
    const group = result.groups.find(item => item.id === groupId);
    if (group) setGroupName(group.name);
  }, [groupId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const group = catalog?.groups.find(item => item.id === groupId) ?? null;
  const offerings = (catalog?.offerings ?? []).filter(item => item.groupId === groupId);

  async function saveName() {
    const trimmed = groupName.trim();
    if (trimmed.length < 1 || trimmed.length > 80) {
      setNameError('Informe um nome de até 80 caracteres.');
      return;
    }
    setNameError(undefined);
    setSaving(true);
    const result = await renameAcademicGroup(groupId, trimmed);
    setSaving(false);
    setNotice(result.message);
    setNoticeTone(result.ok ? 'success' : 'warning');
    if (result.ok) await reload();
  }

  async function addOffering() {
    const nextPeriod = period.trim();
    const nextSchedule = schedule.trim();
    const nextRoom = room.trim();
    if (nextPeriod.length < 1 || nextPeriod.length > 80 || nextSchedule.length < 1 || nextSchedule.length > 160 || nextRoom.length < 1 || nextRoom.length > 80) {
      setOfferError('Informe período, horário e sala.');
      return;
    }
    setOfferError(undefined);
    setSaving(true);
    let chosenId = subjectId;
    let createdNow = false;
    if (!chosenId) {
      const nextName = newName.trim();
      const nextProgram = program.trim();
      if (nextName.length < 1 || nextName.length > 160 || nextProgram.length < 1 || nextProgram.length > 160) {
        setSaving(false);
        setOfferError('Escolha uma disciplina ou informe nome e curso da nova.');
        return;
      }
      const created = await createSubject(nextName, nextProgram);
      if (!created.ok) {
        setSaving(false);
        setNotice(created.message);
        setNoticeTone('warning');
        return;
      }
      chosenId = created.subject.id;
      createdNow = true;
      setSubjectId(chosenId);
      setNewName('');
    }
    const result = await createOffering({
      subjectId: chosenId,
      groupId,
      period: nextPeriod,
      schedule: nextSchedule,
      room: nextRoom
    });
    setSaving(false);
    setNotice(result.ok ? result.message : createdNow ? `A disciplina foi cadastrada, mas não entrou na turma. ${result.message}` : result.message);
    setNoticeTone(result.ok ? 'success' : 'warning');
    if (!result.ok) {
      if (createdNow) await reload();
      return;
    }
    setSubjectId(null);
    setNewName('');
    setProgram('');
    setPeriod('');
    setSchedule('');
    setRoom('');
    await reload();
  }

  if (!groupId) {
    return <Screen tone="brand" title="Turma" onBack={() => router.back()}>
        <LoadingState message="Carregando turma…" />
      </Screen>;
  }

  return <Screen tone="brand" title={group?.name ?? 'Turma'} subtitle="Disciplinas ministradas nesta turma" onBack={() => router.back()} keyboard>
      {loading && !catalog ? <LoadingState message="Carregando turma…" /> : null}
      {!loading && catalog && !group ? <EmptyState icon="classes" title="Turma não encontrada" description="Ela pode pertencer a outra conta ou ainda não ter sido gravada." /> : null}
      {group ? <>
          <TextField label="Nome da turma" value={groupName} onChangeText={setGroupName} maxLength={80} error={nameError} />
          <Button label={saving ? 'Salvando…' : 'Salvar nome'} variant="secondary" onPress={() => void saveName()} disabled={saving} />
          {offerings.length === 0 ? <EmptyState icon="classes" title="Nenhuma disciplina" description="Associe uma disciplina abaixo. O mesmo nome pode existir em outra turma." /> : offerings.map(item => <Card key={item.id}>
              <AppText size="heading">{item.subjectName}</AppText>
              <AppText size="label" tone="muted">{item.program} · {item.period}</AppText>
              <AppText size="label" tone="muted">{item.schedule} · {item.room}</AppText>
            </Card>)}
          <AppText size="heading">Associar disciplina</AppText>
          <AppText size="label" tone="muted">
            Escolha uma disciplina já cadastrada ou informe uma nova. A mesma disciplina pode entrar em outra turma sem um segundo cadastro.
          </AppText>
          <View style={styles.chips}>
            {(catalog?.subjects ?? []).map(subject => <Chip key={subject.id} label={subject.name} selected={subjectId === subject.id} onPress={() => {
              setSubjectId(current => current === subject.id ? null : subject.id);
              setNewName('');
            }} />)}
          </View>
          {subjectId ? null : <>
              <TextField label="Nova disciplina" value={newName} onChangeText={setNewName} placeholder="Programação de Aplicativos" maxLength={160} />
              <TextField label="Curso" value={program} onChangeText={setProgram} placeholder="ADS" maxLength={160} />
            </>}
          <TextField label="Período letivo" value={period} onChangeText={setPeriod} placeholder="2026.1" maxLength={80} />
          <TextField label="Horário" value={schedule} onChangeText={setSchedule} placeholder="Segunda · 19:00" maxLength={160} />
          <TextField label="Sala" value={room} onChangeText={setRoom} placeholder="Laboratório 2" maxLength={80} />
          {offerError ? <AppText size="label" tone="warning">{offerError}</AppText> : null}
          <Button label={saving ? 'Salvando…' : 'Incluir na turma'} onPress={() => void addOffering()} disabled={saving} />
        </> : null}
      {notice ? <Notice message={notice} tone={noticeTone} /> : null}
    </Screen>;
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  }
});
