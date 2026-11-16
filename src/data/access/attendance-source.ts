import type {
  ClassDetails,
  ClassSession,
  DemoProfile,
  HistoryEntry,
  StudentSubject,
  UserRole,
  WeeklySample,
} from '@/domain';

/**
 * Contrato síncrono da pré-visualização local.
 * A conta real usa os mesmos tipos de domínio, carregados em src/data/remote.
 */
export interface AttendanceSource {
  getProfile(role: UserRole): DemoProfile;
  listClasses(): ClassSession[];
  getClass(id: string): ClassDetails | null;
  listSubjects(): StudentSubject[];
  getSubject(id: string): StudentSubject | null;
  listHistory(): HistoryEntry[];
  weeklySample(): WeeklySample[];
}
