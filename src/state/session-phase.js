export function profilePhaseForSession(current, userId) {
  if (!userId) return 'clear';
  if (current?.phase === 'ready' && current.userId === userId) return 'refresh';
  return 'load';
}
