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
import { pendingMessages } from '@/content/messages';
import { previewSource } from '@/data';
import { countMarks, matchesSearch, type AttendanceMark } from '@/domain';
import { MissingRecord } from '@/features/shared/missing-record';
import { useRouteParam } from '@/navigation/params';
import { spacing } from '@/theme';

type Filter = 'todos' | AttendanceMark;

const filters: { id: Filter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'presente', label: 'Presentes' },
  { id: 'falta', label: 'Faltas' },
  { id: 'justificada', label: 'Justificadas' },
];

export function AttendanceListScreen() {
  const router = useRouter();
  const turmaId = useRouteParam('turmaId');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const details = turmaId ? previewSource.getClass(turmaId) : null;
  const visible = useMemo(() => {
    const students = details?.students ?? [];
    return students.filter((entry) => {
      const matchesFilter = filter === 'todos' || entry.mark === filter;
      return matchesFilter && matchesSearch(query, entry.name);
    });
  }, [details, filter, query]);

  if (!turmaId) {
    return (
      <Screen tone="brand" title="Lista de presença" onBack={() => router.back()}>
        <LoadingState />
      </Screen>
    );
  }

  if (!details) return <MissingRecord title="Lista de presença" />;

  const counts = countMarks(details.students);

  return (
    <Screen tone="brand" title="Lista de presença" subtitle={details.discipline} onBack={() => router.back()}>
      <View style={styles.stats}>
        <StatTile label="Presentes" value={String(counts.presente)} />
        <StatTile label="Faltas" value={String(counts.falta)} />
        <StatTile label="Justificadas" value={String(counts.justificada)} />
      </View>
      {details.students.length === 0 ? (
        <EmptyState icon="classes" title="Lista nominal indisponível" description={pendingMessages.rosterLater} />
      ) : (
        <>
          <SearchField value={query} onChangeText={setQuery} placeholder="Buscar aluno" />
          <View style={styles.filters}>
            {filters.map((item) => (
              <Chip key={item.id} label={item.label} selected={filter === item.id} onPress={() => setFilter(item.id)} />
            ))}
          </View>
          {visible.length === 0 ? (
            <EmptyState title="Nenhum aluno neste filtro" description="Limpe a busca ou escolha outro status." />
          ) : (
            visible.map((entry) => (
              <PersonRow key={entry.id} name={entry.name} mark={entry.mark} timeLabel={entry.timeLabel} />
            ))
          )}
          <Notice message="Esta lista é uma pré-visualização e não registra presença." />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
