/**
 * DADOS DEMONSTRATIVOS.
 * Turmas locais para o painel do professor. Não há persistência.
 */

import { exampleSessionCode, openCallRoster } from '@/data/demo/roster';
const classes = [{
  id: 'ds',
  discipline: 'Desenvolvimento de Sistemas',
  program: 'ADS',
  period: '3º período',
  schedule: 'Segunda e quarta · 19:00–20:40',
  room: 'Laboratório 2',
  enrolled: openCallRoster.length,
  presentRecords: 164,
  expectedRecords: 180,
  nextClassLabel: 'Hoje · 19:00',
  hasOpenCall: true,
  students: openCallRoster,
  sessionCode: exampleSessionCode,
  sessionValidLabel: 'Exemplo válido por 40 minutos'
}, {
  id: 'bd',
  discipline: 'Banco de Dados',
  program: 'ADS',
  period: '3º período',
  schedule: 'Terça e quinta · 19:00–20:40',
  room: 'Sala 12',
  enrolled: 28,
  presentRecords: 168,
  expectedRecords: 200,
  nextClassLabel: 'Terça · 19:00',
  hasOpenCall: false,
  students: [],
  sessionCode: null,
  sessionValidLabel: null
}, {
  id: 'es',
  discipline: 'Engenharia de Software',
  program: 'ADS',
  period: '3º período',
  schedule: 'Sexta · 19:00–22:30',
  room: 'Sala 4',
  enrolled: 26,
  presentRecords: 140,
  expectedRecords: 180,
  nextClassLabel: 'Sexta · 19:00',
  hasOpenCall: false,
  students: [],
  sessionCode: null,
  sessionValidLabel: null
}, {
  id: 'md',
  discipline: 'Matemática Discreta',
  program: 'ADS',
  period: '3º período',
  schedule: 'Quinta · 20:50–22:30',
  room: 'Sala 8',
  enrolled: 30,
  presentRecords: 82,
  expectedRecords: 120,
  nextClassLabel: 'Quinta · 20:50',
  hasOpenCall: false,
  students: [],
  sessionCode: null,
  sessionValidLabel: null
}];
export function listDemoClasses() {
  return classes.map(item => ({
    id: item.id,
    discipline: item.discipline,
    program: item.program,
    period: item.period,
    schedule: item.schedule,
    room: item.room,
    enrolled: item.enrolled,
    presentRecords: item.presentRecords,
    expectedRecords: item.expectedRecords,
    nextClassLabel: item.nextClassLabel,
    hasOpenCall: item.hasOpenCall
  }));
}
export function getDemoClass(id) {
  return classes.find(item => item.id === id) ?? null;
}
export const weeklySample = [{
  label: 'Seg',
  percent: 92
}, {
  label: 'Ter',
  percent: 88
}, {
  label: 'Qua',
  percent: 85
}, {
  label: 'Qui',
  percent: 71
}, {
  label: 'Sex',
  percent: 90
}];
