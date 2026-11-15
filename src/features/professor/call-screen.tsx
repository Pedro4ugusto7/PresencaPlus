import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CodePanel } from '@/components/ui/code-panel';
import { Notice } from '@/components/ui/notice';
import { PersonRow } from '@/components/ui/person-row';
import { Screen } from '@/components/ui/screen';
import { StatTile } from '@/components/ui/stat-tile';
import { LoadingState } from '@/components/ui/loading-state';
import { pendingMessages } from '@/content/messages';
import { previewSource } from '@/data';
import { countMarks, nextMark, type AttendanceEntry } from '@/domain';
import { MissingRecord } from '@/features/shared/missing-record';
import { useRouteParam } from '@/navigation/params';
import { spacing } from '@/theme';

export function CallScreen() {
  const router = useRouter();
  const turmaId = useRouteParam('turmaId');
  const details = turmaId ? previewSource.getClass(turmaId) : null;
  const [entries, setEntries] = useState<AttendanceEntry[]>(details?.students ?? []);
  const [notice, setNotice] = useState<string | null>(null);

  if (!turmaId) {
    return (
      <Screen tone="brand" title="Chamada" onBack={() => router.back()}>
        <LoadingState />
      </Screen>
    );
  }

  if (!details) return <MissingRecord title="Chamada" />;

  const counts = countMarks(entries);

  function cycle(id: string) {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, mark: nextMark(entry.mark), timeLabel: 'prévia' } : entry,
      ),
    );
  }

  return (
    <Screen
      tone="brand"
      title="Área de chamada"
      subtitle={details.discipline}
      onBack={() => router.back()}>
      <Badge label="Pré-visualização" tone="accent" />
      {details.sessionCode && details.sessionValidLabel ? (
        <CodePanel
          code={details.sessionCode}
          validLabel={details.sessionValidLabel}
          qrMessage={pendingMessages.qr}
        />
      ) : (
        <Notice message={pendingMessages.noOpenCall} tone="warning" />
      )}
      <View style={styles.stats}>
        <StatTile label="Presentes" value={String(counts.presente)} />
        <StatTile label="Faltas" value={String(counts.falta)} />
        <StatTile label="Justificadas" value={String(counts.justificada)} />
      </View>
      {entries.length > 0 ? (
        <Card>
          <Notice message={pendingMessages.visualOnly} tone="demo" />
          {entries.map((entry) => (
            <PersonRow
              key={entry.id}
              name={entry.name}
              mark={entry.mark}
              timeLabel={entry.timeLabel}
              onPress={() => cycle(entry.id)}
            />
          ))}
        </Card>
      ) : null}
      <Button
        label="Encerrar chamada"
        variant="secondary"
        onPress={() => setNotice(pendingMessages.closeCall)}
        accessibilityHint="Não encerra uma chamada real"
      />
      {notice ? <Notice message={notice} tone="warning" /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
