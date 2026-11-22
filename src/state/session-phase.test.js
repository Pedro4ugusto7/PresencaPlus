import { profilePhaseForSession } from './session-phase.js';
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
run('sessão ausente limpa o perfil sem tratar como carregamento', () => {
  assert(profilePhaseForSession({ phase: 'ready', userId: 'professor-1' }, null) === 'clear', 'saída');
});
run('renovação do mesmo professor não volta para carregamento', () => {
  assert(profilePhaseForSession({ phase: 'ready', userId: 'professor-1' }, 'professor-1') === 'refresh', 'mesmo usuário');
});
run('troca de usuário e primeiro acesso carregam o perfil', () => {
  assert(profilePhaseForSession({ phase: 'ready', userId: 'professor-1' }, 'professor-2') === 'load', 'outro usuário');
  assert(profilePhaseForSession({ phase: 'idle', userId: null }, 'professor-1') === 'load', 'primeiro acesso');
  assert(profilePhaseForSession({ phase: 'error', userId: 'professor-1' }, 'professor-1') === 'load', 'erro anterior');
});
