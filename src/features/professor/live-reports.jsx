import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BarChart } from '@/components/ui/bar-chart';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { FrequencyBar } from '@/components/ui/frequency-bar';
import { AppText } from '@/components/ui/app-text';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { StatTile } from '@/components/ui/stat-tile';
import { TextField } from '@/components/ui/text-field';
import { CatalogGate } from '@/features/shared/catalog-gate';
import { exportReportCsv } from '@/features/professor/export-report';
import { frequencyTone, markLabel, matchesSearch } from '@/domain';
import { buildReport, parseAcademicDayInput, reportCsv, reportHasExportRows } from '@/domain/reports';
import { useCatalog } from '@/state/catalog';
import { spacing } from '@/theme';
const modes = [{
  id: 'overview',
  label: 'Visão geral'
}, {
  id: 'class',
  label: 'Por turma'
}, {
  id: 'student',
  label: 'Por aluno'
}];
function percentLabel(rate) {
  return rate == null ? '—' : `${rate}%`;
}
function offeringLabel(item) {
  const place = item.groupName || item.period;
  return place ? `${item.discipline} · ${place}` : item.discipline;
}
export function LiveReports() {
  return <CatalogGate title="Relatórios">
      <ReportBody />
    </CatalogGate>;
}
function ReportBody() {
  const catalog = useCatalog();
  const source = catalog.reportSource;
  const [mode, setMode] = useState('overview');
  const [classId, setClassId] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState(null);
  const from = parseAcademicDayInput(fromText);
  const to = parseAcademicDayInput(toText);
  const periodError = !from.ok || !to.ok ? 'Use o formato dd/mm/aaaa.' : from.day && to.day && from.day > to.day ? 'A data inicial precisa ser anterior ou igual à final.' : null;
  const report = useMemo(() => periodError ? null : buildReport(source, {
    classId,
    studentId,
    from: from.day,
    to: to.day
  }), [classId, from.day, periodError, source, studentId, to.day]);
  const directory = useMemo(() => periodError ? null : buildReport(source, {
    classId,
    from: from.day,
    to: to.day
  }), [classId, from.day, periodError, source, to.day]);
  const visibleStudents = useMemo(() => {
    const people = directory?.studentsDetail ?? [];
    return people.filter(person => matchesSearch(studentQuery, person.name, person.registrationCode ?? ''));
  }, [directory, studentQuery]);
  const selectedStudent = report?.studentsDetail.find(person => person.id === studentId) ?? null;
  const selectedClass = report?.byClass.find(item => item.id === classId) ?? null;
  async function exportCsv() {
    if (!report || !reportHasExportRows(report)) {
      setExportMessage('Não há linhas para exportar com os filtros atuais.');
      return;
    }
    setExporting(true);
    setExportMessage(null);
    try {
      await exportReportCsv('presenca-relatorio.csv', reportCsv(report));
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (!message.includes('cancel') && !message.includes('dismiss')) {
        setExportMessage('Não foi possível exportar o CSV.');
      }
    } finally {
      setExporting(false);
    }
  }
  if (!source || source.classes.length === 0) {
    return <Screen tone="brand" title="Relatórios" subtitle="Indicadores das suas turmas" safeBottom={false}>
        <EmptyState icon="reports" title="Nenhuma turma para relatar" description="Cadastre uma turma em Gestão acadêmica. Os números aparecem aqui a partir dos dados gravados nesta conta." />
      </Screen>;
  }
  return <Screen tone="brand" title="Relatórios" subtitle="Indicadores das suas turmas" safeBottom={false} notice={exportMessage} noticeTone="warning">
      <View style={styles.filters}>
        {modes.map(item => <Chip key={item.id} label={item.label} selected={mode === item.id} onPress={() => setMode(item.id)} />)}
      </View>
      <View style={styles.filters}>
        <Chip label="Todas as turmas" selected={!classId} onPress={() => setClassId(null)} />
        {source.classes.map(item => <Chip key={item.id} label={offeringLabel(item)} selected={classId === item.id} onPress={() => setClassId(item.id)} />)}
      </View>
      <View style={styles.dates}>
        <View style={styles.date}>
          <TextField label="De" value={fromText} onChangeText={setFromText} placeholder="dd/mm/aaaa" autoCapitalize="none" keyboardType="numbers-and-punctuation" error={fromText && !from.ok ? periodError : null} />
        </View>
        <View style={styles.date}>
          <TextField label="Até" value={toText} onChangeText={setToText} placeholder="dd/mm/aaaa" autoCapitalize="none" keyboardType="numbers-and-punctuation" error={toText && !to.ok ? periodError : null} />
        </View>
      </View>
      {periodError && from.ok && to.ok ? <Notice tone="warning" message={periodError} /> : null}
      {studentId ? <Chip label="Limpar aluno" selected={false} onPress={() => setStudentId(null)} /> : null}
      {periodError || !report ? null : <>
          <Summary report={report} />
          {mode === 'overview' ? <OverviewCharts report={report} /> : null}
          {mode === 'class' ? <ClassReport report={report} selected={selectedClass} onSelect={setClassId} /> : null}
          {mode === 'student' ? <StudentReport people={visibleStudents} query={studentQuery} onQuery={setStudentQuery} selected={selectedStudent} onSelect={setStudentId} /> : null}
          <Button label={exporting ? 'Exportando…' : 'Exportar CSV'} variant="secondary" disabled={exporting || !reportHasExportRows(report)} onPress={() => void exportCsv()} />
        </>}
    </Screen>;
}
function Summary({
  report
}) {
  return <>
      <View style={styles.stats}>
        <StatTile label="Turmas" value={String(report.classes)} />
        <StatTile label="Alunos" value={String(report.students)} hint="Sem repetir quem cursa mais de uma turma" />
        <StatTile label="Chamadas encerradas" value={String(report.closedCalls)} />
        <StatTile label="Em aberto" value={String(report.openCalls)} hint="Não entram na frequência" />
        <StatTile label="Presenças" value={String(report.presences)} hint="Somente comparecimento real" />
        <StatTile label="Faltas" value={String(report.absences)} />
        <StatTile label="Faltas justificadas" value={String(report.justified)} hint="Não entram como presença" />
        <StatTile label="Frequência" value={percentLabel(report.rate)} hint={report.unrecorded > 0 ? `${report.unrecorded} sem registro, fora do percentual` : null} />
      </View>
      <Notice message="A frequência é o comparecimento real: presenças divididas pela soma de presenças, faltas e faltas justificadas das chamadas encerradas. A falta justificada não entra como presença. Chamada aberta não gera falta. Aluno sem registro nessa chamada também não recebe falta automática." />
      {report.openPresences > 0 ? <Notice message={`${report.openPresences} presença(s) em chamada ainda aberta passam a contar depois do encerramento.`} /> : null}
    </>;
}
function OverviewCharts({
  report
}) {
  return <>
      {report.week.length > 0 ? <Card>
          <AppText size="heading">Dias úteis</AppText>
          <BarChart items={report.week} caption="Frequência definitiva por dia da semana, no fuso de Brasília. Dias sem chamada encerrada não aparecem. Sábado e domingo continuam nos totais." />
        </Card> : null}
      <Card>
        <AppText size="heading">Frequência por turma</AppText>
        {report.byClass.length === 0 ? <EmptyState icon="reports" title="Nada neste filtro" description="Ajuste a turma, o aluno ou o período." /> : report.byClass.map(item => <ClassFrequency key={item.id} item={item} />)}
      </Card>
    </>;
}
function ClassFrequency({
  item
}) {
  return <View style={styles.block}>
      <AppText size="label">{item.label}</AppText>
      <AppText size="caption" tone="muted">
        {`${item.students} alunos · ${item.closedCalls} encerradas · ${item.presences} presenças · ${item.absences} faltas · ${item.justified} justificadas`}
      </AppText>
      {item.rate == null ? <AppText size="caption" tone="muted">Sem percentual definitivo</AppText> : <FrequencyBar percent={item.rate} tone={frequencyTone(item.rate)} />}
    </View>;
}
function ClassReport({
  report,
  selected,
  onSelect
}) {
  if (!selected) {
    if (report.byClass.length === 0) {
      return <EmptyState icon="classes" title="Nenhuma turma no filtro" description="Ajuste o período ou limpe o aluno selecionado." />;
    }
    return <Card>
        <AppText size="heading">Escolha a turma</AppText>
        {report.byClass.map(item => <Card key={item.id} accessibilityLabel={item.label} onPress={() => onSelect(item.id)}>
            <AppText size="label">{item.label}</AppText>
            <AppText size="caption" tone="muted">{`${item.students} alunos · frequência ${percentLabel(item.rate)}`}</AppText>
          </Card>)}
      </Card>;
  }
  return <Card>
      <AppText size="heading">{selected.label}</AppText>
      <AppText size="caption" tone="muted">
        {`${selected.closedCalls} chamadas encerradas · ${selected.openCalls} em aberto`}
      </AppText>
      {selected.rows.length === 0 ? <EmptyState icon="profile" title="Nenhum aluno matriculado" description="A matrícula desta turma ainda não tem alunos neste filtro." /> : selected.rows.map(student => <StudentLine key={student.studentId} student={student} />)}
    </Card>;
}
function StudentReport({
  people,
  query,
  onQuery,
  selected,
  onSelect
}) {
  if (!selected) {
    return <Card>
        <AppText size="heading">Escolha o aluno</AppText>
        <SearchField value={query} onChangeText={onQuery} placeholder="Buscar nome ou matrícula" />
        {people.length === 0 ? <EmptyState icon="profile" title="Nenhum aluno encontrado" description="Ajuste a busca ou o filtro de turma." /> : people.map(person => <Card key={person.id} accessibilityLabel={person.name} onPress={() => onSelect(person.id)}>
            <AppText size="label">{person.name}</AppText>
            <AppText size="caption" tone="muted">{person.registrationCode || 'Sem matrícula no cadastro'}</AppText>
          </Card>)}
      </Card>;
  }
  return <Card>
      <AppText size="heading">{selected.name}</AppText>
      <AppText size="caption" tone="muted">{selected.registrationCode || 'Sem matrícula no cadastro'}</AppText>
      <AppText size="label">{`Presenças ${selected.presences} · Faltas ${selected.absences} · Justificadas ${selected.justified} · Frequência ${percentLabel(selected.rate)}`}</AppText>
      {selected.unrecorded > 0 ? <AppText size="caption" tone="muted">{`${selected.unrecorded} chamada(s) encerrada(s) sem registro. Isso não foi contado como falta.`}</AppText> : null}
      <AppText size="label">Turmas</AppText>
      {selected.classes.map(item => <AppText key={item.id} size="caption" tone="muted">{item.label}</AppText>)}
      <AppText size="label">Histórico</AppText>
      {selected.history.length === 0 ? <EmptyState icon="reports" title="Sem chamadas no período" description="Não há chamada encerrada deste aluno no filtro atual." /> : selected.history.map(entry => <View key={entry.id} style={styles.block}>
          <AppText size="label">{entry.dateLabel}</AppText>
          <AppText size="caption" tone="muted">{entry.classLabel}</AppText>
          <AppText size="caption">{entry.mark === 'justificada' ? 'Falta justificada' : entry.mark ? markLabel(entry.mark) : 'Sem registro'}</AppText>
        </View>)}
    </Card>;
}
function StudentLine({
  student
}) {
  return <View style={styles.block}>
      <AppText size="label">{student.name}</AppText>
      <AppText size="caption" tone="muted">
        {`${student.registrationCode || 'Sem matrícula'} · ${student.presences} presenças · ${student.absences} faltas · ${student.justified} justificadas · ${percentLabel(student.rate)}`}
      </AppText>
      {student.unrecorded > 0 ? <AppText size="caption" tone="muted">{`${student.unrecorded} sem registro`}</AppText> : null}
    </View>;
}
const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  dates: {
    flexDirection: 'row',
    gap: spacing.md
  },
  date: {
    flex: 1
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  block: {
    gap: spacing.xs
  }
});
