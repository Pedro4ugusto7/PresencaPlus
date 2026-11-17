import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/app-text';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { StatTile } from '@/components/ui/stat-tile';
import { EmptyState } from '@/components/ui/empty-state';
import { attendanceRate, describeStudentCheckIn, formatPercent, frequencyTone, MINIMUM_FREQUENCY, weightedAttendance } from '@/domain';
import { CheckInBanner } from '@/features/student/check-in-banner';
import { CatalogGate } from '@/features/shared/catalog-gate';
import { SubjectCard } from '@/features/student/subject-card';
import { useCatalog } from '@/state/catalog';
import { spacing } from '@/theme';
export function StudentDashboardScreen() {
  const router = useRouter();
  const catalog = useCatalog();
  const profile = catalog.profile;
  const subjects = catalog.subjects;
  const overall = weightedAttendance(subjects);
  const critical = subjects.filter(subject => frequencyTone(attendanceRate(subject.attended, subject.totalClasses)) === 'critical');
  const openSubject = subjects.find(subject => subject.hasOpenCall);
  const openCheckIn = openSubject ? describeStudentCheckIn({
    discipline: openSubject.name,
    current: openSubject.currentCall ?? null,
    previous: openSubject.previousCall ?? null
  }) : null;
  if (!profile) return <CatalogGate title="Início">{null}</CatalogGate>;
  return <CatalogGate title="Início">
    <Screen tone="brand" title={`Olá, ${profile.firstName}`} subtitle={catalog.mode === 'demo' ? `${profile.course} · demonstração` : profile.course} safeBottom={false}>
      <View style={styles.stats}>
        <StatTile label="Frequência geral" value={formatPercent(overall)} hint="Aulas registradas" />
        <StatTile label="Disciplinas" value={String(subjects.length)} />
      </View>
      {critical.length > 0 ? <Notice tone="warning" message={`Atenção: ${critical.map(subject => subject.name).join(', ')} ${critical.length > 1 ? 'estão' : 'está'} abaixo de ${MINIMUM_FREQUENCY}%.`} /> : null}
      {openSubject && openCheckIn ? <Card>
          <AppText size="caption" tone="accent">
            {openCheckIn.kind === 'confirmed' ? 'Presença confirmada' : 'Chamada aberta'}
          </AppText>
          <AppText size="heading">{openSubject.name}</AppText>
          {catalog.mode === 'live' && openCheckIn.kind === 'confirmed' ? <CheckInBanner view={openCheckIn} /> : <AppText size="label" tone="muted">
              {openSubject.nextClassLabel} · {openSubject.room}
            </AppText>}
          <Button label={catalog.mode === 'live' && !openCheckIn.actionsEnabled ? 'Ver presença' : 'Ir para o registro'} onPress={() => router.push(catalog.paths.register(openSubject.id))} />
        </Card> : null}
      <SectionHeader title="Minhas disciplinas" actionLabel="Ver todas" onAction={() => router.push(catalog.paths.studentSubjects)} />
      {subjects.length === 0 ? <EmptyState icon="subjects" title="Nenhuma disciplina vinculada" description={catalog.mode === 'demo' ? 'A pré-visualização não encontrou disciplinas locais.' : 'Quando a instituição vincular matrículas a esta conta, elas aparecem aqui.'} /> : subjects.slice(0, 3).map(subject => <SubjectCard key={subject.id} item={subject} />)}
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
