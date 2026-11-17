import { StyleSheet, View } from 'react-native';
import { BarChart } from '@/components/ui/bar-chart';
import { Card } from '@/components/ui/card';
import { FrequencyBar } from '@/components/ui/frequency-bar';
import { AppText } from '@/components/ui/app-text';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { StatTile } from '@/components/ui/stat-tile';
import { EmptyState } from '@/components/ui/empty-state';
import { pendingMessages } from '@/content/messages';
import { attendanceRate, frequencyTone, MINIMUM_FREQUENCY } from '@/domain';
import { CatalogGate } from '@/features/shared/catalog-gate';
import { useCatalog } from '@/state/catalog';
import { spacing } from '@/theme';
export function ReportsScreen() {
  const catalog = useCatalog();
  const classes = catalog.classes;
  const rates = classes.map(item => ({
    item,
    percent: attendanceRate(item.presentRecords, item.expectedRecords)
  }));
  const average = rates.length ? Math.round(rates.reduce((sum, rate) => sum + rate.percent, 0) / rates.length) : 0;
  const below = rates.filter(rate => rate.percent < MINIMUM_FREQUENCY);
  return <CatalogGate title="Relatórios">
    <Screen tone="brand" title="Relatórios" subtitle={catalog.mode === 'demo' ? 'Indicadores locais de demonstração' : 'Indicadores das suas turmas'} safeBottom={false}>
      <View style={styles.stats}>
        <StatTile label="Frequência média" value={`${average}%`} />
        <StatTile label="Turmas abaixo de 75%" value={String(below.length)} />
      </View>
      <Card>
        <AppText size="heading">{catalog.mode === 'demo' ? 'Semana ilustrativa' : 'Semana'}</AppText>
        {catalog.weekly.length === 0 ? <EmptyState icon="reports" title="Semana sem sessões" description="O gráfico aparece quando houver sessões encerradas nesta conta." /> : <BarChart items={catalog.weekly} caption={catalog.mode === 'demo' ? 'Exemplo calculado sobre os dados locais. Não é um relatório oficial.' : 'Calculado sobre as sessões encerradas desta conta.'} />}
      </Card>
      <Card>
        <AppText size="heading">Frequência por turma</AppText>
        {rates.map(({
          item,
          percent
        }) => <View key={item.id} style={styles.block}>
            <AppText size="label">{item.discipline}</AppText>
            <FrequencyBar percent={percent} tone={frequencyTone(percent)} label="Registros" />
          </View>)}
      </Card>
      {below.length > 0 ? <Notice tone="warning" message={`${below.map(rate => rate.item.discipline).join(', ')} ${below.length > 1 ? 'estão' : 'está'} abaixo do limite de ${MINIMUM_FREQUENCY}%.`} /> : null}
      <Notice message={pendingMessages.exportReports} />
    </Screen>
    </CatalogGate>;
}
const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  block: {
    gap: spacing.sm
  }
});
