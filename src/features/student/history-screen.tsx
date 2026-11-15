import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/app-text';
import { previewSource } from '@/data';
import { markLabel, type AttendanceMark } from '@/domain';
import { palette, spacing } from '@/theme';

type Filter = 'todos' | AttendanceMark;

const filters: { id: Filter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'presente', label: 'Presentes' },
  { id: 'falta', label: 'Faltas' },
  { id: 'justificada', label: 'Justificadas' },
];

const badgeTone = {
  presente: 'present',
  falta: 'absent',
  justificada: 'justified',
} as const;

export function HistoryScreen() {
  const [filter, setFilter] = useState<Filter>('todos');
  const history = previewSource.listHistory();
  const visible = useMemo(
    () => history.filter((entry) => filter === 'todos' || entry.mark === filter),
    [filter, history],
  );

  return (
    <Screen tone="brand" title="Histórico" subtitle="Frequência local de demonstração" safeBottom={false}>
      <View style={styles.filters}>
        {filters.map((item) => (
          <Chip key={item.id} label={item.label} selected={filter === item.id} onPress={() => setFilter(item.id)} />
        ))}
      </View>
      {visible.length === 0 ? (
        <EmptyState icon="history" title="Nenhum registro neste filtro" description="Escolha outro status para ver o histórico de exemplo." />
      ) : (
        visible.map((entry) => (
          <View key={entry.id} style={styles.row}>
            <View style={styles.text}>
              <AppText size="label">{entry.discipline}</AppText>
              <AppText size="caption" tone="muted">
                {entry.dateLabel}
              </AppText>
            </View>
            <Badge label={markLabel(entry.mark)} tone={badgeTone[entry.mark]} />
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
