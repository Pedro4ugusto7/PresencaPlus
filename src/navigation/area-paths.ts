import type { Href } from 'expo-router';

export type AcademicArea = 'demo' | 'live';

export type AcademicPaths = {
  professorHome: Href;
  professorClasses: Href;
  professorReports: Href;
  professorProfile: Href;
  classDetail: (turmaId: string) => Href;
  call: (turmaId: string) => Href;
  roster: (turmaId: string) => Href;
  studentHome: Href;
  studentSubjects: Href;
  studentHistory: Href;
  studentProfile: Href;
  subjectDetail: (disciplinaId: string) => Href;
  register: (disciplinaId: string) => Href;
};

export function toHref(pathname: string, params?: Record<string, string>): Href {
  if (!params) return pathname as Href;
  return { pathname, params } as Href;
}

export function areaPaths(area: AcademicArea): AcademicPaths {
  const professor = area === 'demo' ? '/demo/professor' : '/professor';
  const student = area === 'demo' ? '/demo/aluno' : '/aluno';

  return {
    professorHome: toHref(professor),
    professorClasses: toHref(`${professor}/turmas`),
    professorReports: toHref(`${professor}/relatorios`),
    professorProfile: toHref(`${professor}/perfil`),
    classDetail: (turmaId) => toHref(`${professor}/turma/[turmaId]`, { turmaId }),
    call: (turmaId) => toHref(`${professor}/chamada/[turmaId]`, { turmaId }),
    roster: (turmaId) => toHref(`${professor}/lista/[turmaId]`, { turmaId }),
    studentHome: toHref(student),
    studentSubjects: toHref(`${student}/disciplinas`),
    studentHistory: toHref(`${student}/historico`),
    studentProfile: toHref(`${student}/perfil`),
    subjectDetail: (disciplinaId) => toHref(`${student}/disciplina/[disciplinaId]`, { disciplinaId }),
    register: (disciplinaId) => toHref(`${student}/registrar/[disciplinaId]`, { disciplinaId }),
  };
}
