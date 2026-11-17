/**
 * DADOS DEMONSTRATIVOS.
 * Ponto único da fonte local. Troque esta implementação quando a fonte real existir.
 */

import { getDemoClass, listDemoClasses, weeklySample } from '@/data/demo/professor';
import { professorProfile, studentProfile } from '@/data/demo/profiles';
import { getDemoSubject, listDemoHistory, listDemoSubjects } from '@/data/demo/student';
export const demoSource = {
  getProfile(role) {
    return role === 'professor' ? professorProfile : studentProfile;
  },
  listClasses: listDemoClasses,
  getClass: getDemoClass,
  listSubjects: listDemoSubjects,
  getSubject: getDemoSubject,
  listHistory: listDemoHistory,
  weeklySample: () => weeklySample
};
export { demoSource as previewSource };
