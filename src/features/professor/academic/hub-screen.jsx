import { useRouter } from 'expo-router';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { toHref } from '@/navigation/area-paths';

const links = [{
  title: 'Turmas acadêmicas',
  text: 'Cadastre períodos e veja as disciplinas de cada turma.',
  href: '/professor/gestao/turmas'
}, {
  title: 'Alunos',
  text: 'Cadastre nome e matrícula e escolha as disciplinas de cada aluno.',
  href: '/professor/gestao/alunos'
}];

export function AcademicHubScreen() {
  const router = useRouter();
  return <Screen tone="brand" title="Gestão acadêmica" subtitle="Turmas, disciplinas e alunos desta conta" onBack={() => router.back()} safeBottom={false}>
      <AppText size="label" tone="muted">
        O aluno não entra neste aplicativo. A matrícula daqui serve depois para a confirmação pela página da chamada.
      </AppText>
      {links.map(link => <Card key={link.href} accessibilityLabel={link.title} onPress={() => router.push(toHref(link.href))}>
          <AppText size="heading">{link.title}</AppText>
          <AppText size="label" tone="muted">{link.text}</AppText>
        </Card>)}
    </Screen>;
}
