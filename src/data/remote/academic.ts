import type {
  AcademicProfile,
  AttendanceEntry,
  AttendanceMark,
  ClassDetails,
  ClassSession,
  HeldClass,
  HistoryEntry,
  StudentCallState,
  StudentSubject,
  WeeklySample,
} from '@/domain';
import { attendanceRate, isAcademicToday } from '@/domain';
import { classCalledOnAcademicDay, displayName } from '@/domain/session-policy';

import { getSupabase } from '@/data/remote/client';

type Mark = AttendanceMark;
type SessionStatus = 'aberta' | 'encerrada';

type RecordRow = {
  id: string;
  student_id: string;
  mark: Mark;
  recorded_at: string;
};

type SessionRow = {
  id: string;
  starts_at: string;
  ends_at: string | null;
  code_expires_at: string | null;
  status: SessionStatus;
  records: RecordRow[] | null;
};

type StudentName = {
  id: string;
  full_name: string;
};

type EnrollmentRow = {
  student: StudentName | StudentName[] | null;
};

type ProfessorClassRow = {
  id: string;
  period: string;
  schedule: string;
  room: string;
  subject: { name: string; program: string } | { name: string; program: string }[] | null;
  enrollments: EnrollmentRow[] | null;
  sessions: SessionRow[] | null;
};

type StudentClassRow = {
  class:
    | {
        id: string;
        period: string;
        schedule: string;
        room: string;
        subject: { name: string; program: string } | { name: string; program: string }[] | null;
        professor: { full_name: string } | { full_name: string }[] | null;
        sessions: SessionRow[] | null;
      }
    | {
        id: string;
        period: string;
        schedule: string;
        room: string;
        subject: { name: string; program: string } | { name: string; program: string }[] | null;
        professor: { full_name: string } | { full_name: string }[] | null;
        sessions: SessionRow[] | null;
      }[]
    | null;
};

export type ProfessorWorkspace = {
  classes: ClassSession[];
  classDetails: Record<string, ClassDetails>;
  weekly: WeeklySample[];
};

export type StudentWorkspace = {
  subjects: StudentSubject[];
  history: HistoryEntry[];
};

const professorSelect = `
  id,
  period,
  schedule,
  room,
  subject:subjects ( name, program ),
  enrollments (
    student:profiles!enrollments_student_id_fkey ( id, full_name )
  ),
  sessions:class_sessions (
    id,
    starts_at,
    ends_at,
    code_expires_at,
    status,
    records:attendance_records ( id, student_id, mark, recorded_at )
  )
`;

const studentSelect = `
  class:classes (
    id,
    period,
    schedule,
    room,
    subject:subjects ( name, program ),
    professor:profiles!classes_professor_id_fkey ( full_name ),
    sessions:class_sessions (
      id,
      starts_at,
      ends_at,
      code_expires_at,
      status,
      records:attendance_records ( id, student_id, mark, recorded_at )
    )
  )
`;

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  timeZone: 'America/Sao_Paulo',
});
const weekLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'] as const;

export function explainQueryFailure(error: { message?: string; code?: string } | null): string {
  const code = error?.code ?? '';
  const message = (error?.message ?? '').toLowerCase();
  if (code === '42501' || message.includes('permission') || message.includes('row-level')) {
    return 'Você não tem permissão para ver estes dados.';
  }
  if (message.includes('fetch') || message.includes('network') || message.includes('failed to fetch')) {
    return 'Não foi possível conectar ao servidor. Verifique a internet e tente de novo.';
  }
  return 'Não foi possível carregar os dados acadêmicos.';
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function many<T>(value: T[] | null | undefined): T[] {
  return value ?? [];
}

function countsAsPresence(mark: Mark): boolean {
  return mark === 'presente' || mark === 'justificada';
}

function closedSessions(sessions: SessionRow[]): SessionRow[] {
  return sessions.filter((session) => session.status === 'encerrada');
}

function openSession(sessions: SessionRow[]): SessionRow | null {
  return sessions.find((session) => session.status === 'aberta') ?? null;
}

function formatClock(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

function nextClassLabel(iso: string | null, schedule: string): string {
  if (!iso) return schedule;
  const time = formatClock(iso);
  if (isAcademicToday(iso)) return `Hoje · ${time}`;
  return `${dateFormatter.format(new Date(iso))} · ${time}`;
}

function sessionValidLabel(session: SessionRow | null): string | null {
  if (!session) return null;
  if (session.code_expires_at) return `Válido até ${formatClock(session.code_expires_at)}`;
  if (!session.ends_at) return 'Chamada aberta';
  return `Válido até ${formatClock(session.ends_at)}`;
}

function summarize(sessions: SessionRow[], enrolled: number): { presentRecords: number; expectedRecords: number } {
  const closed = closedSessions(sessions);
  const presentRecords = closed.reduce((sum, session) => {
    const present = many(session.records).filter((record) => countsAsPresence(record.mark)).length;
    return sum + present;
  }, 0);
  return { presentRecords, expectedRecords: closed.length * enrolled };
}

function roster(enrollments: EnrollmentRow[], sessions: SessionRow[]): { students: AttendanceEntry[]; rosterPending: boolean } {
  const current = openSession(sessions);
  const latestClosed = closedSessions(sessions).sort(
    (left, right) => new Date(right.starts_at).getTime() - new Date(left.starts_at).getTime(),
  )[0];
  const source = current ?? latestClosed ?? null;
  const records = new Map(many(source?.records).map((record) => [record.student_id, record]));
  const students = enrollments
    .map((enrollment) => one(enrollment.student))
    .filter((student): student is StudentName => student != null)
    .map((student) => {
      const record = records.get(student.id);
      const waiting = current != null && !record;
      const entry: AttendanceEntry = {
        id: student.id,
        name: student.full_name.trim() || 'Aluno sem nome',
        mark: record?.mark ?? 'falta',
        timeLabel: record ? formatClock(record.recorded_at) : waiting ? 'Aguardando' : '—',
        pending: waiting,
      };
      return entry;
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));

  return { students, rosterPending: source == null };
}

function weeklyFrom(classes: ProfessorClassRow[]): WeeklySample[] {
  const sessions = classes.flatMap((item) => many(item.sessions));
  const days = weekLabels.map((label, index) => {
    const weekday = index + 1;
    const records = closedSessions(sessions)
      .filter((session) => new Date(session.starts_at).getDay() === weekday)
      .flatMap((session) => many(session.records));
    const present = records.filter((record) => countsAsPresence(record.mark)).length;
    return { label, percent: attendanceRate(present, records.length) };
  });
  if (days.every((day) => day.percent === 0)) return [];
  return days;
}

async function openCodes(sessions: { classId: string; sessionId: string }[]): Promise<Map<string, string | null>> {
  const supabase = getSupabase();
  const codes = new Map<string, string | null>();
  if (!supabase) return codes;

  await Promise.all(
    sessions.map(async (session) => {
      const { data, error } = await supabase.rpc('session_code', { target: session.sessionId });
      if (error || typeof data !== 'string') {
        codes.set(session.classId, null);
        return;
      }
      codes.set(session.classId, data);
    }),
  );
  return codes;
}

export async function loadProfessorWorkspace(): Promise<ProfessorWorkspace> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('A conexão com o servidor ainda não está configurada neste aparelho.');

  const { data, error } = await supabase.from('classes').select(professorSelect);
  if (error) throw new Error(explainQueryFailure(error));

  const rows = ((data ?? []) as ProfessorClassRow[]).slice().sort((left, right) => {
    const leftName = one(left.subject)?.name ?? '';
    const rightName = one(right.subject)?.name ?? '';
    return leftName.localeCompare(rightName, 'pt-BR');
  });

  const opened = rows
    .map((row) => {
      const session = openSession(many(row.sessions));
      return session ? { classId: row.id, sessionId: session.id } : null;
    })
    .filter((item): item is { classId: string; sessionId: string } => item != null);
  const codes = await openCodes(opened);

  const classDetails: Record<string, ClassDetails> = {};
  const classes: ClassSession[] = rows.map((row) => {
    const subject = one(row.subject);
    const sessions = many(row.sessions);
    const enrollments = many(row.enrollments);
    const openedSession = openSession(sessions);
    const totals = summarize(sessions, enrollments.length);
    const people = roster(enrollments, sessions);
    const heldSessions: HeldClass[] = [...sessions]
      .sort((left, right) => new Date(right.starts_at).getTime() - new Date(left.starts_at).getTime())
      .map((session) => ({
        id: session.id,
        label: `${dateFormatter.format(new Date(session.starts_at))} · ${formatClock(session.starts_at)}`,
        status: session.status,
        presentCount: many(session.records).filter((record) => countsAsPresence(record.mark)).length,
      }));
    const details: ClassDetails = {
      id: row.id,
      discipline: subject?.name ?? 'Disciplina',
      program: subject?.program ?? '',
      period: row.period,
      schedule: row.schedule,
      room: row.room,
      enrolled: enrollments.length,
      presentRecords: totals.presentRecords,
      expectedRecords: totals.expectedRecords,
      nextClassLabel: nextClassLabel(openedSession?.starts_at ?? null, row.schedule),
      hasOpenCall: openedSession != null,
      students: people.students,
      sessionCode: codes.get(row.id) ?? null,
      sessionValidLabel: sessionValidLabel(openedSession),
      openSessionId: openedSession?.id ?? null,
      heldSessions,
      calledToday: classCalledOnAcademicDay(sessions.map((session) => session.starts_at)),
      rosterPending: people.rosterPending,
    };
    classDetails[row.id] = details;
    return {
      id: details.id,
      discipline: details.discipline,
      program: details.program,
      period: details.period,
      schedule: details.schedule,
      room: details.room,
      enrolled: details.enrolled,
      presentRecords: details.presentRecords,
      expectedRecords: details.expectedRecords,
      nextClassLabel: details.nextClassLabel,
      hasOpenCall: details.hasOpenCall,
    };
  });

  return { classes, classDetails, weekly: weeklyFrom(rows) };
}

function ownMark(session: SessionRow, userId: string): AttendanceMark | null {
  return many(session.records).find((record) => record.student_id === userId)?.mark ?? null;
}

function toCallState(session: SessionRow, userId: string): StudentCallState {
  return {
    sessionId: session.id,
    status: session.status,
    startsAt: session.starts_at,
    codeExpiresAt: session.code_expires_at,
    mark: ownMark(session, userId),
  };
}

export async function loadStudentWorkspace(userId: string): Promise<StudentWorkspace> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('A conexão com o servidor ainda não está configurada neste aparelho.');

  const { data, error } = await supabase.from('enrollments').select(studentSelect).eq('student_id', userId);
  if (error) throw new Error(explainQueryFailure(error));

  const rows = (data ?? []) as StudentClassRow[];
  const subjects: StudentSubject[] = [];
  const history: { at: number; entry: HistoryEntry }[] = [];

  rows.forEach((row) => {
    const item = one(row.class);
    if (!item) return;
    const subject = one(item.subject);
    const professor = one(item.professor);
    const sessions = many(item.sessions);
    const closed = closedSessions(sessions);
    const opened = openSession(sessions);
    const ordered = [...sessions].sort(
      (left, right) => new Date(right.starts_at).getTime() - new Date(left.starts_at).getTime(),
    );
    const latest = ordered[0] ?? null;
    const current = opened ?? latest;
    const previous =
      ordered.find((session) => session.id !== current?.id && ownMark(session, userId) != null) ?? null;
    const ownRecords = closed.flatMap((session) =>
      many(session.records).filter((record) => record.student_id === userId),
    );
    const attended = ownRecords.filter((record) => countsAsPresence(record.mark)).length;
    const subjectView: StudentSubject = {
      id: item.id,
      name: subject?.name ?? 'Disciplina',
      professor: professor?.full_name?.trim() || 'Professor',
      program: subject?.program ?? '',
      period: item.period,
      schedule: item.schedule,
      room: item.room,
      attended,
      totalClasses: closed.length,
      absences: Math.max(0, closed.length - attended),
      nextClassLabel: nextClassLabel(opened?.starts_at ?? null, item.schedule),
      hasOpenCall: opened != null,
      openSessionId: opened?.id ?? null,
      sessionCode: null,
      currentCall: current ? toCallState(current, userId) : null,
      previousCall: previous ? toCallState(previous, userId) : null,
    };
    subjects.push(subjectView);

    sessions.forEach((session) => {
      many(session.records)
        .filter((record) => record.student_id === userId)
        .forEach((record) => {
          history.push({
            at: new Date(session.starts_at).getTime(),
            entry: {
              id: record.id,
              discipline: subjectView.name,
              dateLabel: `${dateFormatter.format(new Date(session.starts_at))} · ${formatClock(session.starts_at)}`,
              mark: record.mark,
            },
          });
        });
    });
  });

  subjects.sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
  history.sort((left, right) => right.at - left.at);
  return { subjects, history: history.map((item) => item.entry) };
}

export function toAcademicProfile(
  row: {
    id: string;
    role: AcademicProfile['role'];
    full_name: string;
    institution: string;
    course: string;
    identifier: string;
  },
  email: string,
): AcademicProfile {
  const shown = displayName(row.full_name, row.role);
  return {
    id: row.id,
    role: row.role,
    name: shown.name,
    firstName: shown.firstName,
    email: email || 'E-mail não informado',
    institution: row.institution.trim() || 'Instituição não informada',
    identifierLabel: row.role === 'professor' ? 'Código funcional' : 'Matrícula',
    identifier: row.identifier.trim() || 'Não informado',
    course: row.course.trim() || 'Curso não informado',
  };
}
