export type UserRole = 'professor' | 'aluno';

export type AttendanceMark = 'presente' | 'falta' | 'justificada';

export type FrequencyTone = 'good' | 'warning' | 'critical';

export interface AcademicProfile {
  id: string;
  role: UserRole;
  name: string;
  firstName: string;
  email: string;
  institution: string;
  identifierLabel: string;
  identifier: string;
  course: string;
}

export type DemoProfile = AcademicProfile;

export interface AttendanceEntry {
  id: string;
  name: string;
  mark: AttendanceMark;
  timeLabel: string;
  pending?: boolean;
}

export interface ClassSession {
  id: string;
  discipline: string;
  program: string;
  period: string;
  schedule: string;
  room: string;
  enrolled: number;
  presentRecords: number;
  expectedRecords: number;
  nextClassLabel: string;
  hasOpenCall: boolean;
}

export interface ClassDetails extends ClassSession {
  students: AttendanceEntry[];
  sessionCode: string | null;
  sessionValidLabel: string | null;
  openSessionId?: string | null;
  heldSessions?: HeldClass[];
  calledToday?: boolean;
  /** Lista de matrícula ainda sem sessão de chamada. */
  rosterPending?: boolean;
}

export interface StudentSubject {
  id: string;
  name: string;
  professor: string;
  program: string;
  period: string;
  schedule: string;
  room: string;
  attended: number;
  totalClasses: number;
  absences: number;
  nextClassLabel: string;
  hasOpenCall: boolean;
  openSessionId?: string | null;
  sessionCode: string | null;
  currentCall?: StudentCallState | null;
  previousCall?: StudentCallState | null;
}

export interface StudentCallState {
  sessionId: string;
  status: 'aberta' | 'encerrada';
  startsAt: string;
  codeExpiresAt: string | null;
  mark: AttendanceMark | null;
}

export interface HeldClass {
  id: string;
  label: string;
  status: 'aberta' | 'encerrada';
  presentCount: number;
}

export interface HistoryEntry {
  id: string;
  discipline: string;
  dateLabel: string;
  mark: AttendanceMark;
}

export interface WeeklySample {
  label: string;
  percent: number;
}
