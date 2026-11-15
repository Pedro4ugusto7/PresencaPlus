export type UserRole = 'professor' | 'aluno';

export type AttendanceMark = 'presente' | 'falta' | 'justificada';

export type FrequencyTone = 'good' | 'warning' | 'critical';

export interface DemoProfile {
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

export interface AttendanceEntry {
  id: string;
  name: string;
  mark: AttendanceMark;
  timeLabel: string;
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
  sessionCode: string | null;
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
