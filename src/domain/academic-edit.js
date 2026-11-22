export function validateOffering(input) {
  const period = String(input?.period ?? '').trim();
  const schedule = String(input?.schedule ?? '').trim();
  const room = String(input?.room ?? '').trim();
  const groupName = input?.groupName == null ? null : String(input.groupName).trim();
  if (groupName != null && (groupName.length < 1 || groupName.length > 80)) {
    return { ok: false, message: 'Informe o nome da turma com até 80 caracteres.' };
  }
  if (period.length < 1 || period.length > 80) {
    return { ok: false, message: 'Informe o período letivo com até 80 caracteres.' };
  }
  if (schedule.length < 1 || schedule.length > 160) {
    return { ok: false, message: 'Informe o horário com até 160 caracteres.' };
  }
  if (room.length < 1 || room.length > 80) {
    return { ok: false, message: 'Informe a sala com até 80 caracteres.' };
  }
  return { ok: true, period, schedule, room, groupName };
}

export function validateRosterStudent(input) {
  const fullName = String(input?.fullName ?? '').trim();
  const registrationCode = String(input?.registrationCode ?? '').trim();
  if (fullName.length < 1 || fullName.length > 160) {
    return { ok: false, message: 'Informe o nome completo com até 160 caracteres.' };
  }
  if (registrationCode.length < 1 || registrationCode.length > 40) {
    return { ok: false, message: 'Informe a matrícula com até 40 caracteres.' };
  }
  return { ok: true, fullName, registrationCode };
}

export function validateJustification(note) {
  const text = String(note ?? '').trim();
  if (!text) return { ok: true, note: null };
  if (text.length > 1000) return { ok: false, message: 'O motivo pode ter até 1000 caracteres.' };
  return { ok: true, note: text };
}
