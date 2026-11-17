import { useRouter } from 'expo-router';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/app-text';
import { FrequencyBar } from '@/components/ui/frequency-bar';
import { attendanceRate, frequencyTone } from '@/domain';
import { useCatalog } from '@/state/catalog';
export function ClassCard({
  item
}) {
  const router = useRouter();
  const catalog = useCatalog();
  const percent = attendanceRate(item.presentRecords, item.expectedRecords);
  const context = item.groupName ? `${item.groupName}, ${item.period}` : item.period;
  return <Card accessibilityLabel={`${item.discipline}, ${context}, frequência ${percent} por cento`} onPress={() => router.push(catalog.paths.classDetail(item.id))}>
      <AppText size="heading">{item.discipline}</AppText>
      <AppText size="caption" tone="muted">
        {item.groupName ? `${item.groupName} · ${item.period}` : item.period}
      </AppText>
      <AppText size="caption" tone="muted">
        {item.program} · {item.enrolled} alunos
      </AppText>
      <AppText size="caption" tone="muted">
        {item.nextClassLabel} · {item.room}
      </AppText>
      {item.hasOpenCall ? <Badge label="Chamada aberta" tone="accent" /> : null}
      <FrequencyBar percent={percent} tone={frequencyTone(percent)} />
    </Card>;
}
