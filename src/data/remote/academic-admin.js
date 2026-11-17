import { connectionMessages } from '@/content/messages';
import { getSupabase } from '@/data/remote/client';

function explain(error, duplicateMessage) {
  if (!error) return null;
  if (error.code === '23505') return duplicateMessage;
  if (error.code === '42501') return 'O servidor recusou esta operação para esta conta.';
  if (error.code === 'PGRST116') return 'Cadastro não encontrado.';
  return 'Não foi possível concluir. Tente novamente.';
}

function one(value) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function requireProfessor() {
  const supabase = getSupabase();
  if (!supabase) return { supabase: null, userId: null, message: connectionMessages.unconfigured };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, userId: null, message: 'Entre novamente para continuar.' };
  return { supabase, userId: data.user.id, message: null };
}

function offeringFrom(row) {
  const subject = one(row.subject);
  return {
    id: row.id,
    subjectId: row.subject_id,
    groupId: row.academic_group_id,
    period: row.period,
    schedule: row.schedule,
    room: row.room,
    subjectName: subject?.name ?? 'Disciplina',
    program: subject?.program ?? ''
  };
}

export async function loadAcademicCatalog() {
  const ready = await requireProfessor();
  if (!ready.supabase) return { ok: false, message: ready.message };
  const [groups, subjects, classes, students, enrollments] = await Promise.all([
    ready.supabase.from('academic_groups').select('id, name').order('name'),
    ready.supabase.from('subjects').select('id, name, program').order('name'),
    ready.supabase.from('classes').select('id, subject_id, academic_group_id, period, schedule, room, subject:subjects(id, name, program)').order('period'),
    ready.supabase.from('roster_students').select('id, full_name, registration_code').order('full_name'),
    ready.supabase.from('enrollments').select('id, class_id, roster_student_id').not('roster_student_id', 'is', null)
  ]);
  const failed = [groups, subjects, classes, students, enrollments].find(result => result.error);
  if (failed) return { ok: false, message: explain(failed.error, 'Não foi possível carregar os cadastros.') };
  return {
    ok: true,
    groups: groups.data ?? [],
    subjects: subjects.data ?? [],
    offerings: (classes.data ?? []).map(offeringFrom),
    students: students.data ?? [],
    enrollments: enrollments.data ?? []
  };
}

export async function createAcademicGroup(name) {
  const ready = await requireProfessor();
  if (!ready.userId) return { ok: false, message: ready.message };
  const { error } = await ready.supabase.from('academic_groups').insert({
    professor_id: ready.userId,
    name: name.trim()
  });
  if (error) return { ok: false, message: explain(error, 'Você já tem uma turma com esse nome.') };
  return { ok: true, message: 'Turma cadastrada.' };
}

export async function renameAcademicGroup(groupId, name) {
  const ready = await requireProfessor();
  if (!ready.userId) return { ok: false, message: ready.message };
  const { data, error } = await ready.supabase.from('academic_groups').update({ name: name.trim() }).eq('id', groupId).eq('professor_id', ready.userId).select('id');
  if (error) return { ok: false, message: explain(error, 'Você já tem uma turma com esse nome.') };
  if (!data?.length) return { ok: false, message: 'Turma não encontrada.' };
  return { ok: true, message: 'Nome da turma atualizado.' };
}

export async function createSubject(name, program) {
  const ready = await requireProfessor();
  if (!ready.userId) return { ok: false, message: ready.message };
  const { data, error } = await ready.supabase.from('subjects').insert({
    name: name.trim(),
    program: program.trim(),
    created_by: ready.userId
  }).select('id, name, program').single();
  if (error) return { ok: false, message: explain(error, 'Não foi possível cadastrar a disciplina.') };
  return { ok: true, subject: data };
}

export async function createOffering({ subjectId, groupId, period, schedule, room }) {
  const ready = await requireProfessor();
  if (!ready.userId) return { ok: false, message: ready.message };
  const { error } = await ready.supabase.from('classes').insert({
    subject_id: subjectId,
    professor_id: ready.userId,
    academic_group_id: groupId,
    period: period.trim(),
    schedule: schedule.trim(),
    room: room.trim()
  });
  if (error) return { ok: false, message: explain(error, 'Esta disciplina já está nesta turma neste período.') };
  return { ok: true, message: 'Disciplina associada à turma.' };
}

export async function createRosterStudent(fullName, registrationCode) {
  const ready = await requireProfessor();
  if (!ready.userId) return { ok: false, message: ready.message };
  const { error } = await ready.supabase.from('roster_students').insert({
    professor_id: ready.userId,
    full_name: fullName.trim(),
    registration_code: registrationCode.trim()
  });
  if (error) return { ok: false, message: explain(error, 'Esta matrícula já está no seu cadastro.') };
  return { ok: true, message: 'Aluno cadastrado.' };
}

export async function updateRosterStudent(studentId, fullName, registrationCode) {
  const ready = await requireProfessor();
  if (!ready.userId) return { ok: false, message: ready.message };
  const { data, error } = await ready.supabase.from('roster_students').update({
    full_name: fullName.trim(),
    registration_code: registrationCode.trim()
  }).eq('id', studentId).eq('professor_id', ready.userId).select('id');
  if (error) return { ok: false, message: explain(error, 'Esta matrícula já está no seu cadastro.') };
  if (!data?.length) return { ok: false, message: 'Aluno não encontrado.' };
  return { ok: true, message: 'Dados do aluno atualizados.' };
}

export async function enrollRosterStudent(classId, studentId) {
  const ready = await requireProfessor();
  if (!ready.userId) return { ok: false, message: ready.message };
  const { error } = await ready.supabase.from('enrollments').insert({
    class_id: classId,
    roster_student_id: studentId
  });
  if (error) return { ok: false, message: explain(error, 'O aluno já está nesta disciplina.') };
  return { ok: true, message: 'Aluno matriculado na disciplina.' };
}
