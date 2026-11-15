import { useRouter } from 'expo-router';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/app-text';
import { FrequencyBar } from '@/components/ui/frequency-bar';
import { attendanceRate, frequencyTone, type ClassSession } from '@/domain';

type ClassCardProps = {
  item: ClassSession;
};

export function ClassCard({ item }: ClassCardProps) {
  const router = useRouter();
  const percent = attendanceRate(item.presentRecords, item.expectedRecords);

  return (
    <Card
      accessibilityLabel={`${item.discipline}, frequência ${percent} por cento`}
      onPress={() =>
        router.push({ pathname: '/demo/professor/turma/[turmaId]', params: { turmaId: item.id } })
      }>
      <AppText size="heading">{item.discipline}</AppText>
      <AppText size="caption" tone="muted">
        {item.period} · {item.program} · {item.enrolled} alunos
      </AppText>
      <AppText size="caption" tone="muted">
        {item.nextClassLabel} · {item.room}
      </AppText>
      {item.hasOpenCall ? <Badge label="Chamada aberta" tone="accent" /> : null}
      <FrequencyBar percent={percent} tone={frequencyTone(percent)} />
    </Card>
  );
}
