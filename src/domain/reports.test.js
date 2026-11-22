import { buildReport, normalizeReportSource, parseAcademicDayInput, reportCsv } from './reports.js';
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function run(name, check) {
  try {
    check();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'falhou';
    throw new Error(`${name}: ${message}`);
  }
}
function source(classes) {
  return normalizeReportSource(classes);
}
const ana = {
  studentId: null,
  rosterStudentId: 'ana',
  name: 'Ana',
  registrationCode: '2026001'
};
const bia = {
  studentId: 'bia-profile',
  rosterStudentId: null,
  name: 'Bia',
  registrationCode: null
};
run('chamada aberta não gera falta nem entra na frequência', () => {
  const report = buildReport(source([{
    id: 'oferta',
    discipline: 'Cálculo',
    groupName: '1º período',
    period: '2026.1',
    enrollments: [ana],
    sessions: [{
      id: 'aberta',
      startsAt: '2026-11-16T15:00:00.000Z',
      status: 'aberta',
      records: [{
        id: 'presenca-aberta',
        studentId: null,
        rosterStudentId: 'ana',
        mark: 'presente'
      }]
    }]
  }]), {});
  assert(report.closedCalls === 0, 'aberta não é chamada encerrada');
  assert(report.openCalls === 1, 'aberta continua visível');
  assert(report.openPresences === 1, 'presença real da chamada aberta');
  assert(report.presences === 0 && report.absences === 0, 'totais definitivos');
  assert(report.rate === null, 'sem percentual definitivo');
});
run('falta só conta quando a chamada encerrada gravou a marca', () => {
  const report = buildReport(source([{
    id: 'oferta',
    discipline: 'Cálculo',
    groupName: '',
    period: '2026.1',
    enrollments: [ana, bia],
    sessions: [{
      id: 'fechada',
      startsAt: '2026-11-16T15:00:00.000Z',
      status: 'encerrada',
      records: [{
        id: 'falta-ana',
        studentId: null,
        rosterStudentId: 'ana',
        mark: 'falta'
      }]
    }]
  }]), {});
  const rows = report.byClass[0].rows;
  const anaRow = rows.find(row => row.studentId === 'roster:ana');
  const biaRow = rows.find(row => row.studentId === 'profile:bia-profile');
  assert(anaRow.absences === 1 && anaRow.rate === 0, 'falta gravada');
  assert(biaRow.absences === 0 && biaRow.unrecorded === 1 && biaRow.rate === null, 'sem registro não vira falta');
  assert(report.absences === 1 && report.unrecorded === 1, 'visão geral');
});
run('justificada não vira presença e registro duplicado conta uma vez', () => {
  const report = buildReport(source([{
    id: 'oferta',
    discipline: 'Física',
    groupName: '2º',
    period: '2026.1',
    enrollments: [ana, ana],
    sessions: [{
      id: 'fechada',
      startsAt: '2026-11-16T15:00:00.000Z',
      status: 'encerrada',
      records: [{
        id: 'marca',
        studentId: null,
        rosterStudentId: 'ana',
        mark: 'justificada'
      }, {
        id: 'marca',
        studentId: null,
        rosterStudentId: 'ana',
        mark: 'falta'
      }]
    }]
  }]), {});
  assert(report.students === 1, 'matrícula repetida não duplica aluno');
  assert(report.presences === 0 && report.justified === 1 && report.absences === 0, 'justificada fora da presença');
  assert(report.rate === 0, 'frequência só do comparecimento');
});
run('aluno em duas turmas conta uma vez na visão geral', () => {
  const report = buildReport(source([{
    id: 'a',
    discipline: 'Cálculo',
    groupName: '1º',
    period: '2026.1',
    enrollments: [ana],
    sessions: [{
      id: 's1',
      startsAt: '2026-11-16T15:00:00.000Z',
      status: 'encerrada',
      records: [{
        id: 'p1',
        rosterStudentId: 'ana',
        studentId: null,
        mark: 'presente'
      }]
    }]
  }, {
    id: 'b',
    discipline: 'Física',
    groupName: '1º',
    period: '2026.1',
    enrollments: [ana],
    sessions: [{
      id: 's2',
      startsAt: '2026-11-17T15:00:00.000Z',
      status: 'encerrada',
      records: [{
        id: 'p2',
        rosterStudentId: 'ana',
        studentId: null,
        mark: 'falta'
      }]
    }]
  }]), {});
  assert(report.students === 1 && report.classes === 2, 'totais');
  assert(report.presences === 1 && report.absences === 1 && report.rate === 50, 'marcas das duas turmas');
  assert(report.studentsDetail[0].classes.length === 2, 'histórico nas duas turmas');
  assert(report.byClass.length === 2, 'cada turma permanece');
});
run('o período usa o dia acadêmico de São Paulo', () => {
  const evening = '2026-11-16T01:30:00.000Z';
  const report = buildReport(source([{
    id: 'oferta',
    discipline: 'Cálculo',
    groupName: '',
    period: '2026.1',
    enrollments: [ana],
    sessions: [{
      id: 'noite',
      startsAt: evening,
      status: 'encerrada',
      records: [{
        id: 'p',
        rosterStudentId: 'ana',
        studentId: null,
        mark: 'presente'
      }]
    }]
  }]), {});
  const included = buildReport(source([{
    id: 'oferta',
    discipline: 'Cálculo',
    groupName: '',
    period: '2026.1',
    enrollments: [ana],
    sessions: [{
      id: 'noite',
      startsAt: evening,
      status: 'encerrada',
      records: [{
        id: 'p',
        rosterStudentId: 'ana',
        studentId: null,
        mark: 'presente'
      }]
    }]
  }]), {
    to: '2026-11-15'
  });
  const excluded = buildReport(source([{
    id: 'oferta',
    discipline: 'Cálculo',
    groupName: '',
    period: '2026.1',
    enrollments: [ana],
    sessions: [{
      id: 'noite',
      startsAt: evening,
      status: 'encerrada',
      records: [{
        id: 'p',
        rosterStudentId: 'ana',
        studentId: null,
        mark: 'presente'
      }]
    }]
  }]), {
    from: '2026-11-16'
  });
  assert(report.presences === 1, 'sem filtro');
  assert(included.presences === 1 && included.closedCalls === 1, '15 de novembro inclui 22:30 em São Paulo');
  assert(excluded.closedCalls === 0 && excluded.presences === 0, '16 de novembro não inclui a noite anterior');
  assert(report.studentsDetail[0].history[0].dateLabel.includes('22:30'), report.studentsDetail[0].history[0].dateLabel);
});
run('filtro de aluno e turma não mistura outra oferta', () => {
  const base = source([{
    id: 'a',
    discipline: 'Cálculo',
    groupName: '1º',
    period: '2026.1',
    enrollments: [ana, bia],
    sessions: [{
      id: 's1',
      startsAt: '2026-11-16T15:00:00.000Z',
      status: 'encerrada',
      records: [{
        id: 'p1',
        rosterStudentId: 'ana',
        studentId: null,
        mark: 'presente'
      }, {
        id: 'p2',
        studentId: 'bia-profile',
        rosterStudentId: null,
        mark: 'falta'
      }]
    }]
  }, {
    id: 'b',
    discipline: 'Física',
    groupName: '1º',
    period: '2026.1',
    enrollments: [bia],
    sessions: [{
      id: 's2',
      startsAt: '2026-11-17T15:00:00.000Z',
      status: 'encerrada',
      records: [{
        id: 'p3',
        studentId: 'bia-profile',
        rosterStudentId: null,
        mark: 'presente'
      }]
    }]
  }]);
  const onlyBia = buildReport(base, {
    studentId: 'profile:bia-profile'
  });
  const onlyClass = buildReport(base, {
    classId: 'a',
    studentId: 'profile:bia-profile'
  });
  assert(onlyBia.students === 1 && onlyBia.classes === 2, 'aluno nas duas turmas');
  assert(onlyBia.presences === 1 && onlyBia.absences === 1, 'marcas da Bia');
  assert(onlyClass.classes === 1 && onlyClass.absences === 1 && onlyClass.presences === 0, 'uma turma');
});
run('fonte vazia não fabrica percentual', () => {
  const report = buildReport(source([]), {});
  assert(report.classes === 0 && report.students === 0 && report.rate === null, 'vazio');
});
run('data inválida e csv com vírgula', () => {
  assert(parseAcademicDayInput('').ok && parseAcademicDayInput('').day === null, 'vazio');
  assert(parseAcademicDayInput('16/11/2026').day === '2026-11-16', 'data válida');
  assert(parseAcademicDayInput('31/02/2026').ok === false, 'dia inexistente');
  const csv = reportCsv(buildReport(source([{
    id: 'a',
    discipline: 'Cálculo, I',
    groupName: '1º',
    period: '2026.1',
    enrollments: [{
      ...ana,
      name: 'Ana "Bia"'
    }],
    sessions: []
  }]), {}));
  assert(csv.charCodeAt(0) === 0xfeff, 'bom');
  assert(csv.includes('Turma;Aluno;Matrícula;Presenças;Faltas;Faltas justificadas;Sem registro;Frequência'), 'cabeçalho');
  assert(csv.includes('Cálculo, I · 1º;'), csv);
  assert(csv.includes('"Ana ""Bia"""'), csv);
  assert(csv.includes('\r\n'), 'quebra do excel');
});
