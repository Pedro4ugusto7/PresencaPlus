import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/app-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Notice } from '@/components/ui/notice';
import { SectionHeader } from '@/components/ui/section-header';
import { StatTile } from '@/components/ui/stat-tile';
import { Screen } from '@/components/ui/screen';
import { attendanceRate, MINIMUM_FREQUENCY } from '@/domain';
import { CatalogGate } from '@/features/shared/catalog-gate';
import { ClassCard } from '@/features/professor/class-card';
import { useCatalog } from '@/state/catalog';
import { spacing } from '@/theme';
export function ProfessorDashboardScreen() {
  const router = useRouter();
  const catalog = useCatalog();
  const reload = catalog.reload;
  const live = catalog.mode === 'live';
  useFocusEffect(useCallback(() => {
    if (!live) return undefined;
    reload({ silent: true, minAgeMs: 20000 });
  }, [live, reload]));
  const profile = catalog.profile;
  const classes = catalog.classes;
  const rates = classes.map(item => attendanceRate(item.presentRecords, item.expectedRecords));
  const average = rates.length ? Math.round(rates.reduce((sum, rate) => sum + rate, 0) / rates.length) : 0;
  const below = rates.filter(rate => rate < MINIMUM_FREQUENCY).length;
  const openClass = classes.find(item => item.hasOpenCall);
  if (!profile) return <CatalogGate title="Início">{null}</CatalogGate>;
  return <CatalogGate title="Início">
    <Screen tone="brand" title={`Olá, ${profile.firstName}`} subtitle={catalog.mode === 'demo' ? `${profile.institution} · demonstração` : profile.institution} safeBottom={false}>
      <View style={styles.stats}>
        <StatTile label="Turmas" value={String(classes.length)} />
        <StatTile label="Frequência média" value={`${average}%`} />
        <StatTile label="Abaixo de 75%" value={String(below)} />
      </View>

      {openClass ? <Card>
          <AppText size="caption" tone="accent">
            Próxima aula
          </AppText>
          <AppText size="heading">{openClass.discipline}</AppText>
          <AppText size="label" tone="muted">
            {openClass.nextClassLabel} · {openClass.room}
          </AppText>
          <Button label="Abrir área de chamada" onPress={() => router.push(catalog.paths.call(openClass.id))} />
        </Card> : null}

      {catalog.mode === 'demo' ? <Notice message="A gestão de turmas, disciplinas e alunos grava só na conta real do professor. A demonstração não altera cadastros." tone="demo" /> : <Card>
          <AppText size="heading">Gestão acadêmica</AppText>
          <AppText size="label" tone="muted">
            Cadastre turmas, disciplinas e alunos desta conta.
          </AppText>
          <Button label="Abrir gestão" onPress={() => router.navigate('/professor/gestao')} />
        </Card>}

      <SectionHeader title="Minhas turmas" actionLabel="Ver todas" onAction={() => router.navigate(catalog.paths.professorClasses)} />
      {classes.length === 0 ? <EmptyState icon="classes" title="Nenhuma turma vinculada" description={catalog.mode === 'demo' ? 'A pré-visualização não encontrou turmas locais.' : 'Cadastre uma turma e uma disciplina em Gestão acadêmica. A oferta aparece aqui depois de gravada.'} /> : classes.slice(0, 3).map(item => <ClassCard key={item.id} item={item} />)}
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
