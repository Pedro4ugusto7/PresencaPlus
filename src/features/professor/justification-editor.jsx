import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { TextField } from '@/components/ui/text-field';
import { justifyClosedAbsence, removeAbsenceJustification } from '@/data/remote/academic-admin';
import { validateJustification } from '@/domain/academic-edit';

export function JustificationEditor({ entry, onChanged, onResult }) {
  const [note, setNote] = useState(entry.reason ?? '');
  const [editing, setEditing] = useState(entry.mark === 'falta');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [tone, setTone] = useState('warning');
  if (!entry.recordId || entry.mark === 'presente' || entry.pending) return null;

  async function save() {
    const parsed = validateJustification(note);
    if (!parsed.ok) {
      setTone('warning');
      setMessage(parsed.message);
      return;
    }
    setMessage(null);
    setSaving(true);
    const result = await justifyClosedAbsence(entry.recordId, parsed.note);
    setSaving(false);
    onResult?.(result.message, result.ok ? 'success' : 'warning');
    if (result.ok) {
      setEditing(false);
      onChanged();
    }
  }

  async function remove() {
    setMessage(null);
    setSaving(true);
    const result = await removeAbsenceJustification(entry.recordId);
    setSaving(false);
    onResult?.(result.message, result.ok ? 'success' : 'warning');
    setConfirmRemove(false);
    if (result.ok) onChanged();
  }

  return <>
      {entry.mark === 'justificada' && !editing ? <Notice tone="info" message={entry.reason ? `Falta justificada. Motivo: ${entry.reason}` : 'Falta justificada, sem motivo informado. Ela não conta como presença.'} /> : null}
      {editing ? <>
          <TextField label="Motivo, se quiser informar" value={note} onChangeText={setNote} maxLength={1000} />
          <Button label={saving ? 'Salvando…' : entry.mark === 'justificada' ? 'Salvar motivo' : 'Justificar falta'} variant="secondary" onPress={() => void save()} disabled={saving} />
          {message ? <Notice tone={tone} message={message} /> : null}
        </> : null}
      {entry.mark === 'justificada' && !editing ? <Button label="Editar justificativa" variant="secondary" onPress={() => setEditing(true)} disabled={saving} /> : null}
      {entry.mark === 'justificada' && !confirmRemove ? <Button label="Remover justificativa" variant="ghost" onPress={() => setConfirmRemove(true)} disabled={saving} /> : null}
      {confirmRemove ? <>
          <Notice tone="warning" message="A falta volta a constar na lista. A presença confirmada não é alterada." />
          <Button label={saving ? 'Removendo…' : 'Confirmar remoção'} variant="secondary" onPress={() => void remove()} disabled={saving} />
          <Button label="Cancelar" variant="ghost" onPress={() => setConfirmRemove(false)} disabled={saving} />
        </> : null}
    </>;
}
