import { professorSections, selectedProfessorSection } from './professor-sections.js';
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
run('a seção segue a tela interna do professor', () => {
  assert(selectedProfessorSection('live', '/professor') === 'inicio', 'início');
  assert(selectedProfessorSection('live', '/professor/turmas') === 'turmas', 'lista de turmas');
  assert(selectedProfessorSection('live', '/professor/turma/abc') === 'turmas', 'detalhe');
  assert(selectedProfessorSection('live', '/professor/chamada/abc') === 'turmas', 'chamada');
  assert(selectedProfessorSection('live', '/professor/chamadas/abc') === 'turmas', 'histórico');
  assert(professorSections('live').find(section => section.id === 'inicio').label === 'Início', 'rótulo início');
  assert(professorSections('live').every(section => section.label !== 'Não.'), 'sem rótulo Não');
  assert(selectedProfessorSection('live', '/professor/gestao/alunos/1') === 'gestao', 'gestão');
  assert(selectedProfessorSection('live', '/professor/relatorios') === 'relatorios', 'relatórios');
  assert(selectedProfessorSection('live', '/professor/perfil') === 'perfil', 'perfil');
});
run('turmas não captura o caminho turma', () => {
  assert(selectedProfessorSection('live', '/professor/turmas') !== 'inicio', 'aba turmas');
  assert(selectedProfessorSection('live', '/professor/turma/abc') === 'turmas', 'prefixo turma');
});
run('páginas públicas não selecionam seção do professor', () => {
  assert(selectedProfessorSection('live', '/login') === null, 'login');
  assert(selectedProfessorSection('live', '/recuperar-senha') === null, 'recuperação');
  assert(selectedProfessorSection('live', '/presenca/token') === null, 'qr público');
});
run('a demonstração não oferece gestão', () => {
  const ids = professorSections('demo').map(section => section.id);
  assert(!ids.includes('gestao'), 'sem gestão na demonstração');
  assert(selectedProfessorSection('demo', '/demo/professor/turma/1') === 'turmas', 'turma da demonstração');
});
