import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Notice } from '@/components/ui/notice';
import { PersonRow } from '@/components/ui/person-row';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { StatTile } from '@/components/ui/stat-tile';
import { LoadingState } from '@/components/ui/loading-state';
import { AppText } from '@/components/ui/app-text';
import { pendingMessages } from '@/content/messages';
import { countMarks, matchesSearch } from '@/domain';
import { CatalogGate } from '@/features/shared/catalog-gate';
import { MissingRecord } from '@/features/shared/missing-record';
import { useCatalog } from '@/state/catalog';
import { useRouteParam } from '@/navigation/params';
import { spacing } from '@/theme';
const filters = [{
  id: 'todos',
  label: 'Todos'
}, {
  id: 'pendente',
  label: 'Pendentes'
}, {
  id: 'presente',
  label: 'Presentes'
}, {
  id: 'falta',
  label: 'Faltas'
}, {
  id: 'justificada',
  label: 'Justificadas'
}];
export function AttendanceListScreen() {
  const router = useRouter();
  const catalog = useCatalog();
  const turmaId = useRouteParam('turmaId');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('todos');
  const details = turmaId ? catalog.getClass(turmaId) : null;
  const visible = useMemo(() => {
    const students = details?.students ?? [];
    return students.filter(entry => {
      const matchesFilter = filter === 'todos' || (filter === 'pendente' ? entry.pending === true : !entry.pending && entry.mark === filter);
      return matchesFilter && matchesSearch(query, entry.name, entry.registrationCode ?? '');
    });
  }, [details, filter, query]);
  if (!turmaId) {
    return <Screen tone="brand" title="Lista de presença" onBack={() => router.back()}>
        <LoadingState />
      </Screen>;
  }
  if (!details) {
    return <CatalogGate title="Lista de presença" onBack={() => router.back()}>
        <MissingRecord title="Lista de presença" />
      </CatalogGate>;
  }
  const settled = details.students.filter(entry => !entry.pending);
  const counts = countMarks(settled);
  const pendingCount = details.students.length - settled.length;
  return <CatalogGate title="Lista de presença" onBack={() => router.back()}>
    <Screen tone="brand" title="Lista de presença" subtitle={[details.groupName, details.period, details.discipline].filter(Boolean).join(' · ')} onBack={() => router.back()}>
      {details.rosterPending ? null : <View style={styles.stats}>
          <StatTile label="Presentes" value={String(counts.presente)} />
          {pendingCount > 0 ? <StatTile label="Pendentes" value={String(pendingCount)} /> : null}
          <StatTile label="Faltas" value={String(counts.falta)} />
          <StatTile label="Justificadas" value={String(counts.justificada)} />
        </View>}
      {details.rosterPending ? <>
          {details.students.length === 0 ? <EmptyState icon="classes" title="Nenhum aluno matriculado" description="A lista aparece quando houver matrículas nesta turma." /> : details.students.map(entry => <AppText key={entry.id} size="label">
                {entry.registrationCode ? `${entry.name} · ${entry.registrationCode}` : entry.name}
              </AppText>)}
          <Notice message="Esta é a lista de alunos matriculados. Ainda não há sessão de chamada." />
        </> : details.students.length === 0 ? <EmptyState icon="classes" title="Lista nominal indisponível" description={pendingMessages.rosterLater} /> : <>
          <SearchField value={query} onChangeText={setQuery} placeholder="Buscar aluno" />
          <View style={styles.filters}>
            {filters.filter(item => item.id !== 'pendente' || pendingCount > 0).map(item => <Chip key={item.id} label={item.label} selected={filter === item.id} onPress={() => setFilter(item.id)} />)}
          </View>
          {visible.length === 0 ? <EmptyState title="Nenhum aluno neste filtro" description="Limpe a busca ou escolha outro status." /> : visible.map(entry => <PersonRow key={entry.id} name={entry.name} detail={entry.registrationCode ? `Matrícula ${entry.registrationCode}` : null} mark={entry.mark} pending={entry.pending} timeLabel={entry.timeLabel} />)}
          <Notice message={catalog.mode === 'demo' ? 'Esta lista é uma pré-visualização e não registra presença.' : 'Presentes e faltas desta lista acompanham a chamada mais recente. Enquanto ela estiver aberta, quem ainda não confirmou fica pendente.'} />
        </>}
    </Screen>
    </CatalogGate>;
}
const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  }
});
