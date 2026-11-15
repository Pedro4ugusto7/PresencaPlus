import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/app-text';
import { SectionHeader } from '@/components/ui/section-header';
import { StatTile } from '@/components/ui/stat-tile';
import { Screen } from '@/components/ui/screen';
import { previewSource } from '@/data';
import { attendanceRate, MINIMUM_FREQUENCY } from '@/domain';
import { ClassCard } from '@/features/professor/class-card';
import { spacing } from '@/theme';

export function ProfessorDashboardScreen() {
  const router = useRouter();
  const profile = previewSource.getProfile('professor');
  const classes = previewSource.listClasses();
  const rates = classes.map((item) => attendanceRate(item.presentRecords, item.expectedRecords));
  const average = rates.length ? Math.round(rates.reduce((sum, rate) => sum + rate, 0) / rates.length) : 0;
  const below = rates.filter((rate) => rate < MINIMUM_FREQUENCY).length;
  const openClass = classes.find((item) => item.hasOpenCall);

  return (
    <Screen
      tone="brand"
      title={`Olá, ${profile.firstName}`}
      subtitle={`${profile.institution} · demonstração`}
      safeBottom={false}>
      <View style={styles.stats}>
        <StatTile label="Turmas" value={String(classes.length)} />
        <StatTile label="Frequência média" value={`${average}%`} />
        <StatTile label="Abaixo de 75%" value={String(below)} />
      </View>

      {openClass ? (
        <Card>
          <AppText size="caption" tone="accent">
            Próxima aula
          </AppText>
          <AppText size="heading">{openClass.discipline}</AppText>
          <AppText size="label" tone="muted">
            {openClass.nextClassLabel} · {openClass.room}
          </AppText>
          <Button
            label="Abrir área de chamada"
            onPress={() =>
              router.push({ pathname: '/demo/professor/chamada/[turmaId]', params: { turmaId: openClass.id } })
            }
          />
        </Card>
      ) : null}

      <SectionHeader
        title="Minhas turmas"
        actionLabel="Ver todas"
        onAction={() => router.push('/demo/professor/turmas')}
      />
      {classes.slice(0, 3).map((item) => (
        <ClassCard key={item.id} item={item} />
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
