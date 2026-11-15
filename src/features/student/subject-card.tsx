import { useRouter } from 'expo-router';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/app-text';
import { FrequencyBar } from '@/components/ui/frequency-bar';
import { attendanceRate, frequencyTone, type StudentSubject } from '@/domain';

type SubjectCardProps = {
  item: StudentSubject;
};

export function SubjectCard({ item }: SubjectCardProps) {
  const router = useRouter();
  const percent = attendanceRate(item.attended, item.totalClasses);
  const tone = frequencyTone(percent);

  return (
    <Card
      accessibilityLabel={`${item.name}, frequência ${percent} por cento`}
      onPress={() =>
        router.push({ pathname: '/demo/aluno/disciplina/[disciplinaId]', params: { disciplinaId: item.id } })
      }>
      <AppText size="heading">{item.name}</AppText>
      <AppText size="caption" tone="muted">
        {item.professor} · {item.period}
      </AppText>
      <AppText size="caption" tone="muted">
        {item.nextClassLabel} · {item.room}
      </AppText>
      {item.hasOpenCall ? <Badge label="Chamada aberta" tone="accent" /> : null}
      {tone === 'critical' ? <Badge label="Abaixo de 75%" tone="absent" /> : null}
      <FrequencyBar percent={percent} tone={tone} />
    </Card>
  );
}
