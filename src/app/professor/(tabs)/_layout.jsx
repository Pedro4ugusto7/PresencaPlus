import { RoleTabs } from '@/components/ui/role-tabs';
import { areaPaths } from '@/navigation/area-paths';
export default function ProfessorTabs() {
  const paths = areaPaths('live');
  return <RoleTabs tabs={[{
    name: 'inicio',
    href: paths.professorHome,
    label: 'Início',
    icon: 'home'
  }, {
    name: 'turmas',
    href: paths.professorClasses,
    label: 'Turmas',
    icon: 'classes'
  }, {
    name: 'relatorios',
    href: paths.professorReports,
    label: 'Relatórios',
    icon: 'reports'
  }, {
    name: 'perfil',
    href: paths.professorProfile,
    label: 'Perfil',
    icon: 'profile'
  }]} />;
}
