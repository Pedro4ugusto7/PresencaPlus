import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/app-text';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { StatTile } from '@/components/ui/stat-tile';
import { previewSource } from '@/data';
import { attendanceRate, formatPercent, frequencyTone, MINIMUM_FREQUENCY, weightedAttendance } from '@/domain';
import { SubjectCard } from '@/features/student/subject-card';
import { spacing } from '@/theme';

export function StudentDashboardScreen() {
  const router = useRouter();
  const profile = previewSource.getProfile('aluno');
  const subjects = previewSource.listSubjects();
  const overall = weightedAttendance(subjects);
  const critical = subjects.filter(
    (subject) => frequencyTone(attendanceRate(subject.attended, subject.totalClasses)) === 'critical',
  );
  const openSubject = subjects.find((subject) => subject.hasOpenCall);

  return (
    <Screen
      tone="brand"
      title={`Olá, ${profile.firstName}`}
      subtitle={`${profile.course} · demonstração`}
      safeBottom={false}>
      <View style={styles.stats}>
        <StatTile label="Frequência geral" value={formatPercent(overall)} hint="Aulas registradas" />
        <StatTile label="Disciplinas" value={String(subjects.length)} />
      </View>
      {critical.length > 0 ? (
        <Notice
          tone="warning"
          message={`Atenção: ${critical.map((subject) => subject.name).join(', ')} ${critical.length > 1 ? 'estão' : 'está'} abaixo de ${MINIMUM_FREQUENCY}%.`}
        />
      ) : null}
      {openSubject ? (
        <Card>
          <AppText size="caption" tone="accent">
            Chamada aberta
          </AppText>
          <AppText size="heading">{openSubject.name}</AppText>
          <AppText size="label" tone="muted">
            {openSubject.nextClassLabel} · {openSubject.room}
          </AppText>
          <Button
            label="Ir para o registro"
            onPress={() =>
              router.push({
                pathname: '/demo/aluno/registrar/[disciplinaId]',
                params: { disciplinaId: openSubject.id },
              })
            }
          />
        </Card>
      ) : null}
      <SectionHeader
        title="Minhas disciplinas"
        actionLabel="Ver todas"
        onAction={() => router.push('/demo/aluno/disciplinas')}
      />
      {subjects.slice(0, 3).map((subject) => (
        <SubjectCard key={subject.id} item={subject} />
      ))}
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
