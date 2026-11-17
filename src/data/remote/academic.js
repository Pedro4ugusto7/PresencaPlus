import { attendanceRate, isAcademicToday } from '@/domain';
import { classCalledOnAcademicDay, displayName } from '@/domain/session-policy';
import { ensureCheckInToken } from '@/data/remote/attendance-ops';
import { getSupabase } from '@/data/remote/client';
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
  timeZone: 'America/Sao_Paulo'
});
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  timeZone: 'America/Sao_Paulo'
});
const weekLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
export function explainQueryFailure(error) {
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
function one(value) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}
function many(value) {
  return value ?? [];
}
function countsAsPresence(mark) {
  return mark === 'presente' || mark === 'justificada';
}
function closedSessions(sessions) {
  return sessions.filter(session => session.status === 'encerrada');
}
function openSession(sessions) {
  return sessions.find(session => session.status === 'aberta') ?? null;
}
function formatClock(iso) {
  return timeFormatter.format(new Date(iso));
}
function nextClassLabel(iso, schedule) {
  if (!iso) return schedule;
  const time = formatClock(iso);
  if (isAcademicToday(iso)) return `Hoje · ${time}`;
  return `${dateFormatter.format(new Date(iso))} · ${time}`;
}
function sessionValidLabel(session) {
  if (!session) return null;
  if (session.code_expires_at) return `Válido até ${formatClock(session.code_expires_at)}`;
  if (!session.ends_at) return 'Chamada aberta';
  return `Válido até ${formatClock(session.ends_at)}`;
}
function summarize(sessions, enrolled) {
  const closed = closedSessions(sessions);
  const presentRecords = closed.reduce((sum, session) => {
    const present = many(session.records).filter(record => countsAsPresence(record.mark)).length;
    return sum + present;
  }, 0);
  return {
    presentRecords,
    expectedRecords: closed.length * enrolled
  };
}
function readableName(value) {
  if (typeof value !== 'string') return 'Aluno sem nome';
  const trimmed = value.trim();
  return trimmed || 'Aluno sem nome';
}
function indexById(rows) {
  const indexed = new Map();
  many(rows).forEach(row => {
    if (row?.id) indexed.set(row.id, row);
  });
  return indexed;
}
function groupBy(rows, key) {
  const grouped = new Map();
  many(rows).forEach(row => {
    const id = row?.[key];
    if (!id) return;
    const current = grouped.get(id) ?? [];
    current.push(row);
    grouped.set(id, current);
  });
  return grouped;
}
async function selectByIds(supabase, table, columns, column, ids) {
  if (!ids.length) return [];
  const {
    data,
    error
  } = await supabase.from(table).select(columns).in(column, ids);
  if (error) throw new Error(explainQueryFailure(error));
  return data ?? [];
}
function personFromEnrollment(enrollment, profiles, rosterStudents) {
  if (enrollment.student_id) {
    return {
      id: enrollment.student_id,
      name: readableName(profiles.get(enrollment.student_id)?.full_name),
      registrationCode: null,
      roster: false
    };
  }
  if (!enrollment.roster_student_id) return null;
  const rosterStudent = rosterStudents.get(enrollment.roster_student_id);
  const registrationCode = typeof rosterStudent?.registration_code === 'string' ? rosterStudent.registration_code.trim() : '';
  return {
    id: enrollment.roster_student_id,
    name: readableName(rosterStudent?.full_name),
    registrationCode: registrationCode || null,
    roster: true
  };
}
function roster(people, sessions) {
  const current = openSession(sessions);
  const latestClosed = closedSessions(sessions).sort((left, right) => new Date(right.starts_at).getTime() - new Date(left.starts_at).getTime())[0];
  const source = current ?? latestClosed ?? null;
  const records = many(source?.records);
  const students = people.filter(student => student != null).map(student => {
    const record = records.find(item => student.roster ? item.roster_student_id === student.id : item.student_id === student.id);
    const waiting = current != null && !record;
    return {
      id: student.id,
      name: student.name,
      registrationCode: student.registrationCode ?? null,
      mark: record?.mark ?? 'falta',
      timeLabel: record ? formatClock(record.recorded_at) : waiting ? 'Aguardando' : '—',
      pending: waiting
    };
  }).sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
  return {
    students,
    rosterPending: source == null
  };
}
function weeklyFrom(classes) {
  const sessions = classes.flatMap(item => many(item.sessions));
  const days = weekLabels.map((label, index) => {
    const weekday = index + 1;
    const records = closedSessions(sessions).filter(session => new Date(session.starts_at).getDay() === weekday).flatMap(session => many(session.records));
    const present = records.filter(record => countsAsPresence(record.mark)).length;
    return {
      label,
      percent: attendanceRate(present, records.length)
    };
  });
  if (days.every(day => day.percent === 0)) return [];
  return days;
}
async function openCodes(sessions) {
  const supabase = getSupabase();
  const tokens = new Map();
  if (!supabase) return tokens;
  await Promise.all(sessions.map(async session => {
    const tokenResult = await supabase.rpc('session_check_in_token', { target: session.sessionId });
    const issued = !tokenResult.error && typeof tokenResult.data === 'string' ? tokenResult.data : null;
    if (issued) {
      tokens.set(session.classId, issued);
      return;
    }
    if (tokenResult.error || !session.expiresAt || new Date(session.expiresAt).getTime() <= Date.now()) {
      tokens.set(session.classId, null);
      return;
    }
    tokens.set(session.classId, await ensureCheckInToken(session.sessionId));
  }));
  return tokens;
}
export async function loadProfessorWorkspace() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('A conexão com o servidor ainda não está configurada neste aparelho.');
  const {
    data: authData,
    error: authError
  } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error('Entre novamente para continuar.');
  const {
    data,
    error
  } = await supabase.from('classes').select('id, subject_id, academic_group_id, period, schedule, room').eq('professor_id', authData.user.id);
  if (error) throw new Error(explainQueryFailure(error));
  const classRows = data ?? [];
  const classIds = classRows.map(row => row.id);
  const subjectIds = [...new Set(classRows.map(row => row.subject_id).filter(Boolean))];
  const groupIds = [...new Set(classRows.map(row => row.academic_group_id).filter(Boolean))];
  const [subjects, groups, sessions, enrollments] = await Promise.all([
    selectByIds(supabase, 'subjects', 'id, name, program', 'id', subjectIds),
    selectByIds(supabase, 'academic_groups', 'id, name', 'id', groupIds),
    selectByIds(supabase, 'class_sessions', 'id, class_id, starts_at, ends_at, code_expires_at, status', 'class_id', classIds),
    selectByIds(supabase, 'enrollments', 'id, class_id, student_id, roster_student_id', 'class_id', classIds)
  ]);
  const sessionIds = sessions.map(row => row.id);
  const profileIds = [...new Set(enrollments.map(row => row.student_id).filter(Boolean))];
  const rosterIds = [...new Set(enrollments.map(row => row.roster_student_id).filter(Boolean))];
  const [records, profiles, rosterStudents] = await Promise.all([
    selectByIds(supabase, 'attendance_records', 'id, session_id, student_id, roster_student_id, mark, recorded_at', 'session_id', sessionIds),
    selectByIds(supabase, 'profiles', 'id, full_name', 'id', profileIds),
    selectByIds(supabase, 'roster_students', 'id, full_name, registration_code', 'id', rosterIds)
  ]);
  const subjectsById = indexById(subjects);
  const groupsById = indexById(groups);
  const profilesById = indexById(profiles);
  const rosterById = indexById(rosterStudents);
  const recordsBySession = groupBy(records, 'session_id');
  const sessionsByClass = groupBy(sessions.map(session => ({
    ...session,
    records: recordsBySession.get(session.id) ?? []
  })), 'class_id');
  const enrollmentsByClass = groupBy(enrollments, 'class_id');
  const rows = classRows.map(row => ({
    ...row,
    subject: subjectsById.get(row.subject_id) ?? null,
    academic_group: row.academic_group_id ? groupsById.get(row.academic_group_id) ?? null : null,
    sessions: sessionsByClass.get(row.id) ?? [],
    enrollments: enrollmentsByClass.get(row.id) ?? []
  })).sort((left, right) => {
    const byName = (left.subject?.name ?? '').localeCompare(right.subject?.name ?? '', 'pt-BR');
    if (byName !== 0) return byName;
    const byGroup = (left.academic_group?.name ?? '').localeCompare(right.academic_group?.name ?? '', 'pt-BR');
    if (byGroup !== 0) return byGroup;
    return (left.period ?? '').localeCompare(right.period ?? '', 'pt-BR');
  });
  const opened = rows.map(row => {
    const session = openSession(many(row.sessions));
    return session ? {
      classId: row.id,
      sessionId: session.id,
      expiresAt: session.code_expires_at
    } : null;
  }).filter(item => item != null);
  const tokens = await openCodes(opened);
  const classDetails = {};
  const classes = rows.map(row => {
    const subject = row.subject;
    const sessions = many(row.sessions);
    const enrollments = many(row.enrollments);
    const openedSession = openSession(sessions);
    const totals = summarize(sessions, enrollments.length);
    const people = roster(enrollments.map(enrollment => personFromEnrollment(enrollment, profilesById, rosterById)), sessions);
    const heldSessions = [...sessions].sort((left, right) => new Date(right.starts_at).getTime() - new Date(left.starts_at).getTime()).map(session => ({
      id: session.id,
      label: `${dateFormatter.format(new Date(session.starts_at))} · ${formatClock(session.starts_at)}`,
      status: session.status,
      presentCount: many(session.records).filter(record => countsAsPresence(record.mark)).length
    }));
    const details = {
      id: row.id,
      discipline: subject?.name ?? 'Disciplina',
      program: subject?.program ?? '',
      groupName: row.academic_group?.name ?? null,
      period: row.period,
      schedule: row.schedule,
      room: row.room,
      enrolled: enrollments.length,
      presentRecords: totals.presentRecords,
      expectedRecords: totals.expectedRecords,
      nextClassLabel: nextClassLabel(openedSession?.starts_at ?? null, row.schedule),
      hasOpenCall: openedSession != null,
      students: people.students,
      sessionCode: null,
      checkInToken: tokens.get(row.id) ?? null,
      codeExpiresAt: openedSession?.code_expires_at ?? null,
      sessionValidLabel: sessionValidLabel(openedSession),
      openSessionId: openedSession?.id ?? null,
      heldSessions,
      calledToday: classCalledOnAcademicDay(sessions.map(session => session.starts_at)),
      rosterPending: people.rosterPending
    };
    classDetails[row.id] = details;
    return {
      id: details.id,
      discipline: details.discipline,
      program: details.program,
      groupName: details.groupName,
      period: details.period,
      schedule: details.schedule,
      room: details.room,
      enrolled: details.enrolled,
      presentRecords: details.presentRecords,
      expectedRecords: details.expectedRecords,
      nextClassLabel: details.nextClassLabel,
      hasOpenCall: details.hasOpenCall
    };
  });
  return {
    classes,
    classDetails,
    weekly: weeklyFrom(rows)
  };
}
function ownMark(session, userId) {
  return many(session.records).find(record => record.student_id === userId)?.mark ?? null;
}
function toCallState(session, userId) {
  return {
    sessionId: session.id,
    status: session.status,
    startsAt: session.starts_at,
    codeExpiresAt: session.code_expires_at,
    mark: ownMark(session, userId)
  };
}
export async function loadStudentWorkspace(userId) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('A conexão com o servidor ainda não está configurada neste aparelho.');
  const {
    data,
    error
  } = await supabase.from('enrollments').select(studentSelect).eq('student_id', userId);
  if (error) throw new Error(explainQueryFailure(error));
  const rows = data ?? [];
  const subjects = [];
  const history = [];
  rows.forEach(row => {
    const item = one(row.class);
    if (!item) return;
    const subject = one(item.subject);
    const professor = one(item.professor);
    const sessions = many(item.sessions);
    const closed = closedSessions(sessions);
    const opened = openSession(sessions);
    const ordered = [...sessions].sort((left, right) => new Date(right.starts_at).getTime() - new Date(left.starts_at).getTime());
    const latest = ordered[0] ?? null;
    const current = opened ?? latest;
    const previous = ordered.find(session => session.id !== current?.id && ownMark(session, userId) != null) ?? null;
    const ownRecords = closed.flatMap(session => many(session.records).filter(record => record.student_id === userId));
    const attended = ownRecords.filter(record => countsAsPresence(record.mark)).length;
    const subjectView = {
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
      previousCall: previous ? toCallState(previous, userId) : null
    };
    subjects.push(subjectView);
    sessions.forEach(session => {
      many(session.records).filter(record => record.student_id === userId).forEach(record => {
        history.push({
          at: new Date(session.starts_at).getTime(),
          entry: {
            id: record.id,
            discipline: subjectView.name,
            dateLabel: `${dateFormatter.format(new Date(session.starts_at))} · ${formatClock(session.starts_at)}`,
            mark: record.mark
          }
        });
      });
    });
  });
  subjects.sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
  history.sort((left, right) => right.at - left.at);
  return {
    subjects,
    history: history.map(item => item.entry)
  };
}
export function toAcademicProfile(row, email) {
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
    course: row.course.trim() || 'Curso não informado'
  };
}
