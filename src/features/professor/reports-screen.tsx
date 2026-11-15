import { StyleSheet, View } from 'react-native';

import { BarChart } from '@/components/ui/bar-chart';
import { Card } from '@/components/ui/card';
import { FrequencyBar } from '@/components/ui/frequency-bar';
import { AppText } from '@/components/ui/app-text';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { StatTile } from '@/components/ui/stat-tile';
import { pendingMessages } from '@/content/messages';
import { previewSource } from '@/data';
import { attendanceRate, frequencyTone, MINIMUM_FREQUENCY } from '@/domain';
import { spacing } from '@/theme';

export function ReportsScreen() {
  const classes = previewSource.listClasses();
  const rates = classes.map((item) => ({
    item,
    percent: attendanceRate(item.presentRecords, item.expectedRecords),
  }));
  const average = rates.length ? Math.round(rates.reduce((sum, rate) => sum + rate.percent, 0) / rates.length) : 0;
  const below = rates.filter((rate) => rate.percent < MINIMUM_FREQUENCY);

  return (
    <Screen tone="brand" title="Relatórios" subtitle="Indicadores locais de demonstração" safeBottom={false}>
      <View style={styles.stats}>
        <StatTile label="Frequência média" value={`${average}%`} />
        <StatTile label="Turmas abaixo de 75%" value={String(below.length)} />
      </View>
      <Card>
        <AppText size="heading">Semana ilustrativa</AppText>
        <BarChart
          items={previewSource.weeklySample()}
          caption="Exemplo calculado sobre os dados locais. Não é um relatório oficial."
        />
      </Card>
      <Card>
        <AppText size="heading">Frequência por turma</AppText>
        {rates.map(({ item, percent }) => (
          <View key={item.id} style={styles.block}>
            <AppText size="label">{item.discipline}</AppText>
            <FrequencyBar percent={percent} tone={frequencyTone(percent)} label="Registros" />
          </View>
        ))}
      </Card>
      {below.length > 0 ? (
        <Notice
          tone="warning"
          message={`${below.map((rate) => rate.item.discipline).join(', ')} ${below.length > 1 ? 'estão' : 'está'} abaixo do limite de ${MINIMUM_FREQUENCY}%.`}
        />
      ) : null}
      <Notice message={pendingMessages.exportReports} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  block: {
    gap: spacing.sm,
  },
});
