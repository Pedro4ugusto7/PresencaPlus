import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/app-text';
import { FrequencyBar } from '@/components/ui/frequency-bar';
import { InfoRow } from '@/components/ui/info-row';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { attendanceRate, frequencyTone } from '@/domain';
import { renameAcademicGroup, updateOffering } from '@/data/remote/academic-admin';
import { validateOffering } from '@/domain/academic-edit';
import { CatalogGate } from '@/features/shared/catalog-gate';
import { MissingRecord } from '@/features/shared/missing-record';
import { useCatalog } from '@/state/catalog';
import { useRouteParam } from '@/navigation/params';
import { LoadingState } from '@/components/ui/loading-state';
export function ClassDetailScreen() {
  const router = useRouter();
  const catalog = useCatalog();
  const turmaId = useRouteParam('turmaId');
  const details = turmaId ? catalog.getClass(turmaId) : null;
  const [editing, setEditing] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [period, setPeriod] = useState('');
  const [schedule, setSchedule] = useState('');
  const [room, setRoom] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [noticeTone, setNoticeTone] = useState('warning');
  if (!turmaId) {
    return <Screen tone="brand" title="Turma" onBack={() => router.back()} safeBottom={false}>
        <LoadingState />
      </Screen>;
  }
  if (!details) {
    return <CatalogGate title="Turma" onBack={() => router.back()}>
        <MissingRecord title="Turma" />
      </CatalogGate>;
  }
  const percent = details.expectedRecords > 0 ? attendanceRate(details.presentRecords, details.expectedRecords) : null;
  function beginEdit() {
    setGroupName(details.groupName ?? '');
    setPeriod(details.period ?? '');
    setSchedule(details.schedule ?? '');
    setRoom(details.room ?? '');
    setEditing(true);
    setNotice(null);
  }
  async function save() {
    if (catalog.mode !== 'live') {
      setNoticeTone('demo');
      setNotice('Esta pré-visualização não grava alterações.');
      return;
    }
    const parsed = validateOffering({
      groupName: details.groupId ? groupName : null,
      period,
      schedule,
      room
    });
    if (!parsed.ok) {
      setNoticeTone('warning');
      setNotice(parsed.message);
      return;
    }
    setSaving(true);
    if (details.groupId && parsed.groupName && parsed.groupName !== details.groupName) {
      const renamed = await renameAcademicGroup(details.groupId, parsed.groupName);
      if (!renamed.ok) {
        setSaving(false);
        setNoticeTone('warning');
        setNotice(renamed.message);
        return;
      }
    }
    const result = await updateOffering(details.id, parsed);
    setSaving(false);
    setNoticeTone(result.ok ? 'success' : 'warning');
    setNotice(result.message);
    if (result.ok) {
      setEditing(false);
      catalog.reload({ silent: true, force: true });
    }
  }
  return <CatalogGate title="Turma" onBack={() => router.back()}>
    <Screen tone="brand" title={details.discipline} subtitle={[details.groupName, details.period, details.program].filter(Boolean).join(' · ')} onBack={() => router.back()} keyboard safeBottom={false} notice={notice} noticeTone={noticeTone} onNoticeDismiss={() => setNotice(null)}>
      <Card>
        {percent == null ? <AppText size="label" tone="muted">Sem chamadas encerradas para calcular a frequência.</AppText> : <FrequencyBar percent={percent} tone={frequencyTone(percent)} />}
        {details.groupName ? <InfoRow label="Turma acadêmica" value={details.groupName} /> : null}
        <InfoRow label="Horário" value={details.schedule} />
        <InfoRow label="Sala" value={details.room} />
        <InfoRow label="Alunos" value={String(details.enrolled)} />
        <InfoRow label="Próxima aula" value={details.nextClassLabel} />
        <InfoRow label="Comparecimentos" value={`${details.presentRecords} de ${details.expectedRecords}`} />
      </Card>
      <Button label="Área de chamada" icon="call" onPress={() => router.push(catalog.paths.call(details.id))} />
      <Button label="Lista de presença" variant="secondary" onPress={() => router.push(catalog.paths.roster(details.id))} />
      <Button label="Histórico de chamadas" variant="secondary" icon="history" onPress={() => router.push(catalog.paths.callHistory(details.id))} />
      <Button label={editing ? 'Fechar edição' : 'Editar turma'} variant="secondary" onPress={() => editing ? setEditing(false) : beginEdit()} />
      {editing ? <Card>
          {details.groupId ? <TextField label="Nome da turma" value={groupName} onChangeText={setGroupName} maxLength={80} /> : null}
          <TextField label="Período letivo" value={period} onChangeText={setPeriod} maxLength={80} />
          <TextField label="Horário" value={schedule} onChangeText={setSchedule} maxLength={160} />
          <TextField label="Sala" value={room} onChangeText={setRoom} maxLength={80} />
          <AppText size="caption" tone="muted">O nome da disciplina é compartilhado e não muda nesta tela. Matrículas e chamadas permanecem.</AppText>
          <Button label={saving ? 'Salvando…' : 'Salvar turma'} onPress={() => void save()} disabled={saving} />
        </Card> : null}
      <AppText size="caption" tone="muted">
        {catalog.mode === 'demo' ? 'Os números acima vêm dos dados locais e não são atualizados por esta tela.' : 'A frequência é o comparecimento real dividido por presenças, faltas e faltas justificadas das chamadas encerradas. A falta justificada não conta como presença. Quem ficou sem registro entra fora desse percentual.'}
      </AppText>
    </Screen>
    </CatalogGate>;
}
