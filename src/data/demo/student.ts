/**
 * DADOS DEMONSTRATIVOS.
 * Disciplinas e histórico locais do aluno de exemplo. Não há registro real.
 */
import type { HistoryEntry, StudentSubject } from '@/domain';

import { exampleSessionCode } from '@/data/demo/roster';

const subjects: StudentSubject[] = [
  {
    id: 'ds',
    name: 'Desenvolvimento de Sistemas',
    professor: 'Camila Andrade',
    program: 'ADS',
    period: '3º período',
    schedule: 'Segunda e quarta · 19:00–20:40',
    room: 'Laboratório 2',
    attended: 17,
    totalClasses: 18,
    absences: 1,
    nextClassLabel: 'Hoje · 19:00',
    hasOpenCall: true,
    sessionCode: exampleSessionCode,
  },
  {
    id: 'bd',
    name: 'Banco de Dados',
    professor: 'Ricardo Melo',
    program: 'ADS',
    period: '3º período',
    schedule: 'Terça e quinta · 19:00–20:40',
    room: 'Sala 12',
    attended: 16,
    totalClasses: 20,
    absences: 4,
    nextClassLabel: 'Terça · 19:00',
    hasOpenCall: false,
    sessionCode: null,
  },
  {
    id: 'es',
    name: 'Engenharia de Software',
    professor: 'Helena Prado',
    program: 'ADS',
    period: '3º período',
    schedule: 'Sexta · 19:00–22:30',
    room: 'Sala 4',
    attended: 19,
    totalClasses: 25,
    absences: 6,
    nextClassLabel: 'Sexta · 19:00',
    hasOpenCall: false,
    sessionCode: null,
  },
  {
    id: 'md',
    name: 'Matemática Discreta',
    professor: 'Paulo Nogueira',
    program: 'ADS',
    period: '3º período',
    schedule: 'Quinta · 20:50–22:30',
    room: 'Sala 8',
    attended: 16,
    totalClasses: 25,
    absences: 9,
    nextClassLabel: 'Quinta · 20:50',
    hasOpenCall: false,
    sessionCode: null,
  },
];

const history: HistoryEntry[] = [
  { id: 'h1', discipline: 'Desenvolvimento de Sistemas', dateLabel: '10 nov · 19:00', mark: 'presente' },
  { id: 'h2', discipline: 'Banco de Dados', dateLabel: '07 nov · 19:00', mark: 'presente' },
  { id: 'h3', discipline: 'Matemática Discreta', dateLabel: '06 nov · 20:50', mark: 'falta' },
  { id: 'h4', discipline: 'Engenharia de Software', dateLabel: '31 out · 19:00', mark: 'presente' },
  { id: 'h5', discipline: 'Desenvolvimento de Sistemas', dateLabel: '29 out · 19:00', mark: 'justificada' },
  { id: 'h6', discipline: 'Banco de Dados', dateLabel: '24 out · 19:00', mark: 'falta' },
  { id: 'h7', discipline: 'Matemática Discreta', dateLabel: '23 out · 20:50', mark: 'presente' },
  { id: 'h8', discipline: 'Engenharia de Software', dateLabel: '17 out · 19:00', mark: 'presente' },
];

export function listDemoSubjects(): StudentSubject[] {
  return subjects;
}

export function getDemoSubject(id: string): StudentSubject | null {
  return subjects.find((item) => item.id === id) ?? null;
}

export function listDemoHistory(): HistoryEntry[] {
  return history;
}
