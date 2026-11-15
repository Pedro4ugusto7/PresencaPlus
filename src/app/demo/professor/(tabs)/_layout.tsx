import { RoleTabs } from '@/components/ui/role-tabs';

export default function ProfessorTabs() {
  return (
    <RoleTabs
      tabs={[
        { name: 'inicio', href: '/demo/professor', label: 'Início', icon: 'home' },
        { name: 'turmas', href: '/demo/professor/turmas', label: 'Turmas', icon: 'classes' },
        { name: 'relatorios', href: '/demo/professor/relatorios', label: 'Relatórios', icon: 'reports' },
        { name: 'perfil', href: '/demo/professor/perfil', label: 'Perfil', icon: 'profile' },
      ]}
    />
  );
}
