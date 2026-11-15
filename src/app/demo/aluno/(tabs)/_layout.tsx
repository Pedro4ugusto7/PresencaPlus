import { RoleTabs } from '@/components/ui/role-tabs';

export default function StudentTabs() {
  return (
    <RoleTabs
      tabs={[
        { name: 'inicio', href: '/demo/aluno', label: 'Início', icon: 'home' },
        { name: 'disciplinas', href: '/demo/aluno/disciplinas', label: 'Disciplinas', icon: 'subjects' },
        { name: 'historico', href: '/demo/aluno/historico', label: 'Histórico', icon: 'history' },
        { name: 'perfil', href: '/demo/aluno/perfil', label: 'Perfil', icon: 'profile' },
      ]}
    />
  );
}
