import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/app-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Notice } from '@/components/ui/notice';
import { PersonRow } from '@/components/ui/person-row';
import { Screen } from '@/components/ui/screen';
import { StatTile } from '@/components/ui/stat-tile';
import { LoadingState } from '@/components/ui/loading-state';
import { JustificationEditor } from '@/features/professor/justification-editor';
import { CatalogGate } from '@/features/shared/catalog-gate';
import { MissingRecord } from '@/features/shared/missing-record';
import { useCatalog } from '@/state/catalog';
import { useRouteParam } from '@/navigation/params';
import { spacing } from '@/theme';

export function CallSessionScreen() {
  const router = useRouter();
  const catalog = useCatalog();
  const turmaId = useRouteParam('turmaId');
  const sessaoId = useRouteParam('sessaoId');
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState(null);
  const [noticeTone, setNoticeTone] = useState('warning');
  if (!turmaId || !sessaoId) {
    return <Screen tone="brand" title="Lista de presença" onBack={() => router.back()} safeBottom={false}>
        <LoadingState />
      </Screen>;
  }
  const details = catalog.getClass(turmaId);
  const session = details?.sessionHistory?.find(item => item.id === sessaoId) ?? null;
  if (!details || !session) {
    return <CatalogGate title="Lista de presença" onBack={() => router.back()}>
        <MissingRecord title="Lista de presença" />
      </CatalogGate>;
  }
  const live = catalog.mode === 'live';
  return <CatalogGate title="Lista de presença" onBack={() => router.back()}>
      <Screen tone="brand" title={session.dateLabel} subtitle={[details.groupName, details.discipline, session.timeLabel].filter(Boolean).join(' · ')} onBack={() => router.back()} safeBottom={false} notice={notice} noticeTone={noticeTone} onNoticeDismiss={() => setNotice(null)}>
        <Badge label={session.current ? 'Chamada atual' : 'Lista anterior'} tone={session.current ? 'accent' : 'neutral'} />
        <View style={styles.stats}>
          <StatTile label="Presentes" value={String(session.counts.presente)} />
          <StatTile label="Faltas" value={String(session.counts.falta)} />
          <StatTile label="Justificadas" value={String(session.counts.justificada)} />
          <StatTile label="Sem registro" value={String(session.counts.unrecorded)} />
        </View>
        {session.status === 'aberta' ? <Notice tone="info" message="Esta chamada ainda está aberta. Pendente não é falta. A data é a do início da chamada, no horário de Brasília." /> : <Notice tone="info" message="Lista encerrada. A falta justificada aparece separada e não conta como presença." />}
        {session.students.length === 0 ? <EmptyState icon="classes" title="Nenhum aluno nesta lista" description="A turma não tinha matrícula ativa nesta chamada." /> : session.students.map(entry => <Card key={entry.id}>
            <PersonRow name={entry.name} detail={entry.registrationCode ? `Matrícula ${entry.registrationCode}` : null} mark={entry.mark} pending={entry.pending} timeLabel={entry.timeLabel} />
            {live && session.status === 'encerrada' && selected === entry.id ? <JustificationEditor entry={entry} onChanged={() => catalog.reload({ silent: true, force: true })} onResult={(message, tone) => {
              setNotice(message);
              setNoticeTone(tone);
            }} /> : null}
            {live && session.status === 'encerrada' && (entry.mark === 'falta' || entry.mark === 'justificada') ? <Pressable accessibilityRole="button" accessibilityLabel={entry.mark === 'falta' ? `Justificar falta de ${entry.name}` : `Ver justificativa de ${entry.name}`} onPress={() => setSelected(current => current === entry.id ? null : entry.id)}>
                <AppText size="caption" tone="accent">
                  {selected === entry.id ? 'Fechar' : entry.mark === 'falta' ? 'Justificar falta' : 'Ver justificativa'}
                </AppText>
              </Pressable> : null}
          </Card>)}
      </Screen>
    </CatalogGate>;
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  }
});
