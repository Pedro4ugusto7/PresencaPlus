export function normalizePath(pathname) {
  const path = String(pathname || '/').split('?')[0].split('#')[0];
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path || '/';
}
function exact(path, href) {
  return path === href;
}
function nested(path, href) {
  return path === href || path.startsWith(`${href}/`);
}
export function professorSections(area) {
  const root = area === 'demo' ? '/demo/professor' : '/professor';
  const sections = [{
    id: 'inicio',
    label: 'Início',
    icon: 'home',
    href: root,
    tab: true,
    matches: path => exact(path, root)
  }, {
    id: 'turmas',
    label: 'Turmas',
    icon: 'classes',
    href: `${root}/turmas`,
    tab: true,
    matches: path => nested(path, `${root}/turmas`) || path.startsWith(`${root}/turma/`) || path.startsWith(`${root}/chamada/`) || path.startsWith(`${root}/chamadas/`) || path.startsWith(`${root}/lista/`)
  }];
  if (area !== 'demo') {
    sections.push({
      id: 'gestao',
      label: 'Gestão',
      icon: 'subjects',
      href: `${root}/gestao`,
      tab: false,
      matches: path => nested(path, `${root}/gestao`)
    });
  }
  sections.push({
    id: 'relatorios',
    label: 'Relatórios',
    icon: 'reports',
    href: `${root}/relatorios`,
    tab: true,
    matches: path => nested(path, `${root}/relatorios`)
  }, {
    id: 'perfil',
    label: 'Perfil',
    icon: 'profile',
    href: `${root}/perfil`,
    tab: true,
    matches: path => nested(path, `${root}/perfil`)
  });
  return sections;
}
export function selectedProfessorSection(area, pathname) {
  const path = normalizePath(pathname);
  const sections = professorSections(area);
  const specific = sections.find(section => section.id !== 'inicio' && section.matches(path));
  if (specific) return specific.id;
  const home = sections.find(section => section.id === 'inicio');
  return home?.matches(path) ? home.id : null;
}
