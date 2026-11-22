import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/app-text';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { enrollRosterStudentSecure, loadAcademicCatalog, updateRosterStudent, withdrawRosterEnrollment } from '@/data/remote/academic-admin';
import { validateRosterStudent } from '@/domain/academic-edit';

function firstParam(value) {
  return typeof value === 'string' ? value : '';
}

export function AcademicStudentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const studentId = firstParam(params.alunoId);
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [registration, setRegistration] = useState('');
  const [formError, setFormError] = useState();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [noticeTone, setNoticeTone] = useState('warning');
  const [confirmClassId, setConfirmClassId] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const result = await loadAcademicCatalog();
    setLoading(false);
    if (!result.ok) {
      setNotice(result.message);
      setNoticeTone('warning');
      return;
    }
    setCatalog(result);
    const student = result.students.find(item => item.id === studentId);
    if (student) {
      setFullName(student.full_name);
      setRegistration(student.registration_code);
    }
  }, [studentId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const student = catalog?.students.find(item => item.id === studentId) ?? null;
  const enrolledClassIds = new Set((catalog?.enrollments ?? []).filter(item => item.roster_student_id === studentId).map(item => item.class_id));
  const groups = catalog?.groups ?? [];
  const looseOfferings = (catalog?.offerings ?? []).filter(item => !item.groupId);

  async function save() {
    const parsed = validateRosterStudent({ fullName, registrationCode: registration });
    if (!parsed.ok) {
      setFormError(parsed.message);
      return;
    }
    setFormError(undefined);
    setSaving(true);
    const result = await updateRosterStudent(studentId, parsed.fullName, parsed.registrationCode);
    setSaving(false);
    setNotice(result.message);
    setNoticeTone(result.ok ? 'success' : 'warning');
    if (result.ok) await reload();
  }

  async function enroll(classId) {
    setSaving(true);
    const result = await enrollRosterStudentSecure(classId, studentId);
    setSaving(false);
    setNotice(result.message);
    setNoticeTone(result.ok ? 'success' : 'warning');
    if (result.ok) await reload();
  }

  async function withdraw(classId) {
    setSaving(true);
    const result = await withdrawRosterEnrollment(classId, studentId);
    setSaving(false);
    setConfirmClassId(null);
    setNotice(result.message);
    setNoticeTone(result.ok ? 'success' : 'warning');
    if (result.ok) await reload();
  }

  function offeringCard(offering) {
    const enrolled = enrolledClassIds.has(offering.id);
    return <Card key={offering.id}>
        <AppText size="heading">{offering.subjectName}</AppText>
        <AppText size="label" tone="muted">{offering.period} · {offering.schedule}</AppText>
        {enrolled ? confirmClassId === offering.id ? <>
            <Notice tone="warning" message="Desmatricular somente desta disciplina? O cadastro do aluno e as outras turmas permanecem, assim como as presenças já gravadas." />
            <Button label={saving ? 'Desmatriculando…' : 'Confirmar desmatrícula'} variant="secondary" onPress={() => void withdraw(offering.id)} disabled={saving} />
            <Button label="Cancelar" variant="ghost" onPress={() => setConfirmClassId(null)} disabled={saving} />
          </> : <>
            <AppText size="label" tone="present">Matriculado</AppText>
            <Button label="Desmatricular" variant="ghost" onPress={() => setConfirmClassId(offering.id)} disabled={saving} />
          </> : <Button label={saving ? 'Salvando…' : 'Matricular nesta disciplina'} variant="secondary" onPress={() => void enroll(offering.id)} disabled={saving} />}
      </Card>;
  }

  return <Screen tone="brand" title={student?.full_name ?? 'Aluno'} subtitle="Disciplinas cursadas" onBack={() => router.back()} keyboard safeBottom={false} notice={notice} noticeTone={noticeTone} onNoticeDismiss={() => setNotice(null)}>
      {loading && !catalog ? <LoadingState message="Carregando aluno…" /> : null}
      {!loading && catalog && !student ? <EmptyState icon="profile" title="Aluno não encontrado" description="Esse cadastro pode pertencer a outro professor." /> : null}
      {student ? <>
          <TextField label="Nome completo" value={fullName} onChangeText={setFullName} maxLength={160} error={formError} />
          <TextField label="Matrícula" value={registration} onChangeText={setRegistration} autoCapitalize="none" maxLength={40} />
          <Button label={saving ? 'Salvando…' : 'Salvar alterações'} onPress={() => void save()} disabled={saving} />
          <Notice message="A matrícula continua sendo o identificador do cadastro. A presença na aula usa o código individual da chamada, não este número." tone="info" />
          {groups.map(group => {
            const items = (catalog?.offerings ?? []).filter(item => item.groupId === group.id);
            if (!items.length) return null;
            return <Card key={group.id}>
                <AppText size="heading">{group.name}</AppText>
                {items.map(offeringCard)}
              </Card>;
          })}
          {looseOfferings.length ? <Card>
              <AppText size="heading">Ofertas sem turma acadêmica</AppText>
              {looseOfferings.map(offeringCard)}
            </Card> : null}
          {!catalog?.offerings.length ? <EmptyState icon="classes" title="Nenhuma disciplina disponível" description="Associe uma disciplina a uma turma antes de matricular o aluno." /> : null}
        </> : null}
    </Screen>;
}
