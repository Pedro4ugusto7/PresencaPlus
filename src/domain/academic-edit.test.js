import { validateJustification, validateOffering, validateRosterStudent } from './academic-edit.js';

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

run('turma exige período, horário e sala e preserva o texto aparado', () => {
  const invalid = validateOffering({ period: ' ', schedule: '19:00', room: 'Sala 1' });
  assert(invalid.ok === false, 'período vazio');
  const valid = validateOffering({ groupName: ' ADS ', period: '2026.1', schedule: 'Segunda · 19:00', room: 'Lab 2' });
  assert(valid.ok && valid.groupName === 'ADS' && valid.period === '2026.1', 'aparado');
  assert(validateOffering({ period: '2026.1', schedule: '19:00', room: '1', groupName: null }).groupName === null, 'sem turma acadêmica');
});

run('aluno exige nome e matrícula sem criar outro identificador', () => {
  const invalid = validateRosterStudent({ fullName: 'Ana', registrationCode: '' });
  assert(invalid.ok === false, 'matrícula vazia');
  const valid = validateRosterStudent({ fullName: ' Ana Lima ', registrationCode: ' 2026001 ' });
  assert(valid.fullName === 'Ana Lima' && valid.registrationCode === '2026001', valid.registrationCode);
});

run('motivo da justificativa é opcional e tem limite', () => {
  assert(validateJustification('  ').note === null, 'vazio vira ausência de motivo');
  assert(validateJustification('Atestado').note === 'Atestado', 'motivo');
  assert(validateJustification('x'.repeat(1001)).ok === false, 'longo demais');
});
