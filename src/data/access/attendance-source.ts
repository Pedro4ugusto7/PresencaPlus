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
 * Contrato de leitura da área acadêmica.
 * A implementação atual é local. Uma fonte remota futura deve cumprir a mesma interface.
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
