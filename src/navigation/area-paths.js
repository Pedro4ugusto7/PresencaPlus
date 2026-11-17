export function toHref(pathname, params) {
  if (!params) return pathname;
  return {
    pathname,
    params
  };
}
export function areaPaths(area) {
  const professor = area === 'demo' ? '/demo/professor' : '/professor';
  const student = area === 'demo' ? '/demo/aluno' : '/aluno';
  return {
    professorHome: toHref(professor),
    professorClasses: toHref(`${professor}/turmas`),
    professorReports: toHref(`${professor}/relatorios`),
    professorProfile: toHref(`${professor}/perfil`),
    classDetail: turmaId => toHref(`${professor}/turma/[turmaId]`, {
      turmaId
    }),
    call: turmaId => toHref(`${professor}/chamada/[turmaId]`, {
      turmaId
    }),
    roster: turmaId => toHref(`${professor}/lista/[turmaId]`, {
      turmaId
    }),
    studentHome: toHref(student),
    studentSubjects: toHref(`${student}/disciplinas`),
    studentHistory: toHref(`${student}/historico`),
    studentProfile: toHref(`${student}/perfil`),
    subjectDetail: disciplinaId => toHref(`${student}/disciplina/[disciplinaId]`, {
      disciplinaId
    }),
    register: disciplinaId => toHref(`${student}/registrar/[disciplinaId]`, {
      disciplinaId
    })
  };
}
