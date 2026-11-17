import { RoleTabs } from '@/components/ui/role-tabs';
import { areaPaths } from '@/navigation/area-paths';
export default function StudentTabs() {
  const paths = areaPaths('live');
  return <RoleTabs tabs={[{
    name: 'inicio',
    href: paths.studentHome,
    label: 'Início',
    icon: 'home'
  }, {
    name: 'disciplinas',
    href: paths.studentSubjects,
    label: 'Disciplinas',
    icon: 'subjects'
  }, {
    name: 'historico',
    href: paths.studentHistory,
    label: 'Histórico',
    icon: 'history'
  }, {
    name: 'perfil',
    href: paths.studentProfile,
    label: 'Perfil',
    icon: 'profile'
  }]} />;
}
