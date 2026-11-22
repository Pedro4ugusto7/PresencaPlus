import { attendanceRate } from './attendance.js';
import { academicDay, academicWeekday, formatAcademicDate, formatAcademicTime } from './academic-time.js';
const weekLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
export function personKey(entry) {
  if (entry?.studentId) return `profile:${entry.studentId}`;
  if (entry?.rosterStudentId) return `roster:${entry.rosterStudentId}`;
  return null;
}
export function parseAcademicDayInput(value) {
  const text = String(value ?? '').trim();
  if (!text) return {
    ok: true,
    day: null
  };
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return {
    ok: false,
    day: null
  };
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    return {
      ok: false,
      day: null
    };
  }
  return {
    ok: true,
    day: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  };
}
function readable(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || 'Aluno sem nome';
}
export function normalizeReportSource(classes) {
  return {
    classes: (classes ?? []).map(item => {
      const seenStudents = new Set();
      const seenRecords = new Set();
      const enrollments = [];
      (item.enrollments ?? []).forEach(enrollment => {
        const key = personKey(enrollment);
        if (!key || seenStudents.has(key)) return;
        seenStudents.add(key);
        enrollments.push({
          studentId: enrollment.studentId ?? null,
          rosterStudentId: enrollment.rosterStudentId ?? null,
          name: readable(enrollment.name),
          registrationCode: enrollment.registrationCode ?? null,
          active: enrollment.active !== false
        });
      });
      return {
        id: item.id,
        discipline: typeof item.discipline === 'string' && item.discipline.trim() ? item.discipline.trim() : 'Disciplina',
        groupName: item.groupName ?? '',
        period: item.period ?? '',
        program: item.program ?? '',
        enrollments,
        sessions: (item.sessions ?? []).map(session => ({
          id: session.id,
          startsAt: session.startsAt,
          status: session.status,
          records: (session.records ?? []).filter(record => {
            if (!record?.id || seenRecords.has(record.id) || !personKey(record)) return false;
            seenRecords.add(record.id);
            return true;
          }).map(record => ({
            id: record.id,
            studentId: record.studentId ?? null,
            rosterStudentId: record.rosterStudentId ?? null,
            mark: record.mark
          }))
        }))
      };
    })
  };
}
function classLabel(item) {
  const place = item.groupName || item.period;
  return place ? `${item.discipline} · ${place}` : item.discipline;
}
function inRange(startsAt, from, to) {
  const day = academicDay(startsAt);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}
function definitiveRate(presences, absences, justified = 0) {
  const total = presences + absences + justified;
  if (total <= 0) return null;
  return attendanceRate(presences, total);
}
function emptyTotals() {
  return {
    presences: 0,
    justified: 0,
    absences: 0,
    unrecorded: 0
  };
}
function addMark(totals, mark) {
  if (mark === 'justificada') {
    totals.justified += 1;
    return;
  }
  if (mark === 'presente') {
    totals.presences += 1;
    return;
  }
  if (mark === 'falta') totals.absences += 1;
}
function knownMark(mark) {
  return mark === 'presente' || mark === 'falta' || mark === 'justificada' ? mark : null;
}
function dateLabel(startsAt) {
  return `${formatAcademicDate(startsAt)} · ${formatAcademicTime(startsAt)}`;
}
export function buildReport(source, filters = {}) {
  const classId = filters.classId || null;
  const studentId = filters.studentId || null;
  const from = filters.from || null;
  const to = filters.to || null;
  const classes = (source?.classes ?? []).filter(item => !classId || item.id === classId);
  const enrolledByClass = new Map();
  const students = new Map();
  const activeStudentIds = new Set();
  function rememberStudent(key, enrollment, classItem, active) {
    const current = students.get(key) ?? {
      id: key,
      name: enrollment.name,
      registrationCode: enrollment.registrationCode ?? null,
      classIds: [],
      active: false
    };
    if (!current.classIds.includes(classItem.id)) current.classIds.push(classItem.id);
    if (active) {
      current.active = true;
      activeStudentIds.add(key);
    }
    students.set(key, current);
  }
  classes.forEach(item => {
    const enrolled = new Map();
    item.enrollments.forEach(enrollment => {
      const key = personKey(enrollment);
      if (!key || enrolled.has(key)) return;
      enrolled.set(key, enrollment);
    });
    enrolledByClass.set(item.id, enrolled);
    enrolled.forEach((enrollment, key) => {
      if (studentId && key !== studentId) return;
      rememberStudent(key, enrollment, item, enrollment.active !== false);
    });
  });
  const relevant = studentId ? classes.filter(item => students.get(studentId)?.classIds.includes(item.id)) : classes;
  let closedCalls = 0;
  let openCalls = 0;
  let openPresences = 0;
  const seenRecords = new Set();
  const historyByStudent = new Map();
  const weekBuckets = weekLabels.map(label => ({
    label,
    presences: 0,
    absences: 0,
    justified: 0
  }));
  const byClass = relevant.map(item => {
    const enrolled = enrolledByClass.get(item.id) ?? new Map();
    const activeVisible = [...enrolled.keys()].filter(key => {
      if (studentId && key !== studentId) return false;
      return enrolled.get(key).active !== false;
    });
    const historical = [];
    const studentTotals = new Map(activeVisible.map(key => [key, emptyTotals()]));
    const classTotals = emptyTotals();
    let classClosed = 0;
    let classOpen = 0;
    item.sessions.forEach(session => {
      if (!inRange(session.startsAt, from, to)) return;
      if (session.status === 'aberta') {
        classOpen += 1;
        openCalls += 1;
        session.records.forEach(record => {
          const key = personKey(record);
          if (!key || !enrolled.has(key) || studentId && key !== studentId || seenRecords.has(record.id)) return;
          seenRecords.add(record.id);
          if (record.mark === 'presente') openPresences += 1;
        });
        return;
      }
      if (session.status !== 'encerrada') return;
      classClosed += 1;
      closedCalls += 1;
      const recorded = new Set();
      session.records.forEach(record => {
        const key = personKey(record);
        if (!key || !enrolled.has(key) || studentId && key !== studentId || seenRecords.has(record.id) || recorded.has(key)) return;
        const mark = knownMark(record.mark);
        if (!mark) return;
        seenRecords.add(record.id);
        recorded.add(key);
        if (!studentTotals.has(key)) {
          studentTotals.set(key, emptyTotals());
          historical.push(key);
          rememberStudent(key, enrolled.get(key), item, false);
        }
        const totals = studentTotals.get(key);
        addMark(totals, mark);
        addMark(classTotals, mark);
        const weekday = academicWeekday(session.startsAt);
        if (weekday >= 1 && weekday <= 5) {
          const bucket = weekBuckets[weekday - 1];
          if (mark === 'presente') bucket.presences += 1;
          else if (mark === 'falta') bucket.absences += 1;
          else if (mark === 'justificada') bucket.justified += 1;
        }
        const history = historyByStudent.get(key) ?? [];
        history.push({
          id: record.id,
          classId: item.id,
          classLabel: classLabel(item),
          startsAt: session.startsAt,
          dateLabel: dateLabel(session.startsAt),
          mark
        });
        historyByStudent.set(key, history);
      });
      activeVisible.forEach(key => {
        if (recorded.has(key)) return;
        const totals = studentTotals.get(key);
        totals.unrecorded += 1;
        classTotals.unrecorded += 1;
        const history = historyByStudent.get(key) ?? [];
        history.push({
          id: `${session.id}:${key}`,
          classId: item.id,
          classLabel: classLabel(item),
          startsAt: session.startsAt,
          dateLabel: dateLabel(session.startsAt),
          mark: null
        });
        historyByStudent.set(key, history);
      });
    });
    const rows = [...activeVisible, ...historical].map(key => {
      const person = students.get(key) ?? enrolled.get(key);
      const totals = studentTotals.get(key);
      return {
        studentId: key,
        name: person.name,
        registrationCode: person.registrationCode ?? null,
        active: person.active !== false,
        presences: totals.presences,
        justified: totals.justified,
        absences: totals.absences,
        unrecorded: totals.unrecorded,
        rate: definitiveRate(totals.presences, totals.absences, totals.justified)
      };
    }).sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
    return {
      id: item.id,
      label: classLabel(item),
      discipline: item.discipline,
      groupName: item.groupName,
      period: item.period,
      students: activeVisible.length,
      closedCalls: classClosed,
      openCalls: classOpen,
      presences: classTotals.presences,
      justified: classTotals.justified,
      absences: classTotals.absences,
      unrecorded: classTotals.unrecorded,
      rate: definitiveRate(classTotals.presences, classTotals.absences, classTotals.justified),
      rows
    };
  }).sort((left, right) => left.label.localeCompare(right.label, 'pt-BR'));
  const overview = byClass.reduce((sum, item) => {
    sum.presences += item.presences;
    sum.justified += item.justified;
    sum.absences += item.absences;
    sum.unrecorded += item.unrecorded;
    return sum;
  }, emptyTotals());
  const studentsDetail = [...students.values()].map(person => {
    const rows = byClass.flatMap(item => item.rows.filter(row => row.studentId === person.id));
    const totals = rows.reduce((sum, row) => {
      sum.presences += row.presences;
      sum.justified += row.justified;
      sum.absences += row.absences;
      sum.unrecorded += row.unrecorded;
      return sum;
    }, emptyTotals());
    return {
      id: person.id,
      name: person.name,
      registrationCode: person.registrationCode,
      classes: person.classIds.map(id => ({
        id,
        label: byClass.find(item => item.id === id)?.label ?? 'Turma'
      })),
      presences: totals.presences,
      justified: totals.justified,
      absences: totals.absences,
      unrecorded: totals.unrecorded,
      rate: definitiveRate(totals.presences, totals.absences, totals.justified),
      history: (historyByStudent.get(person.id) ?? []).sort((left, right) => new Date(right.startsAt) - new Date(left.startsAt))
    };
  }).sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
  return {
    classes: relevant.length,
    students: activeStudentIds.size,
    closedCalls,
    openCalls,
    openPresences,
    presences: overview.presences,
    justified: overview.justified,
    absences: overview.absences,
    unrecorded: overview.unrecorded,
    rate: definitiveRate(overview.presences, overview.absences, overview.justified),
    byClass,
    studentsDetail,
    week: weekBuckets.filter(bucket => bucket.presences + bucket.absences + bucket.justified > 0).map(bucket => ({
      label: bucket.label,
      percent: definitiveRate(bucket.presences, bucket.absences, bucket.justified) ?? 0
    }))
  };
}
function escapeCsv(value) {
  let text = String(value ?? '');
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (/[";\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}
export function reportHasExportRows(report) {
  return report.byClass.some(item => item.rows.length > 0);
}
export function reportCsv(report) {
  const lines = [['Turma', 'Aluno', 'Matrícula', 'Presenças', 'Faltas', 'Faltas justificadas', 'Sem registro', 'Frequência']];
  report.byClass.forEach(item => {
    item.rows.forEach(student => {
      lines.push([item.label, student.name, student.registrationCode ?? '', student.presences, student.absences, student.justified, student.unrecorded, student.rate == null ? '' : `${student.rate}%`]);
    });
  });
  return `\uFEFF${lines.map(line => line.map(escapeCsv).join(';')).join('\r\n')}`;
}
