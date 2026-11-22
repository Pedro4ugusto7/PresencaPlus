import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CodePanel } from '@/components/ui/code-panel';
import { Notice } from '@/components/ui/notice';
import { PersonRow } from '@/components/ui/person-row';
import { Screen } from '@/components/ui/screen';
import { StatTile } from '@/components/ui/stat-tile';
import { LoadingState } from '@/components/ui/loading-state';
import { AppText } from '@/components/ui/app-text';
import { pendingMessages } from '@/content/messages';
import { countMarks, formatAcademicDay } from '@/domain';
import { closeClassSession, ensureSessionCodes, openClassSession } from '@/data/remote/attendance-ops';
import { formatAttendanceCode, maskedAttendanceCode } from '@/domain/attendance-code';
import { publicCheckInOrigin, publicCheckInUrl, remainingLabel } from '@/domain/public-check-in';
import { CODE_VALID_MINUTES } from '@/domain/session-policy';
import { copyText } from '@/features/professor/copy-text';
import { CatalogGate } from '@/features/shared/catalog-gate';
import { MissingRecord } from '@/features/shared/missing-record';
import { useCatalog } from '@/state/catalog';
import { useRouteParam } from '@/navigation/params';
import { spacing } from '@/theme';
export function CallScreen() {
  const router = useRouter();
  const catalog = useCatalog();
  const turmaId = useRouteParam('turmaId');
  const details = turmaId ? catalog.getClass(turmaId) : null;
  const [entries, setEntries] = useState([]);
  const [notice, setNotice] = useState(null);
  const [noticeTone, setNoticeTone] = useState('warning');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [codes, setCodes] = useState([]);
  const [codeMode, setCodeMode] = useState(null);
  const [shown, setShown] = useState({});
  const [codeNotice, setCodeNotice] = useState(null);
  const noticeToneRef = useRef(noticeTone);
  noticeToneRef.current = noticeTone;
  useFocusEffect(useCallback(() => () => {
    if (noticeToneRef.current === 'success') setNotice(null);
  }, []));
  useEffect(() => {
    if (!details?.codeExpiresAt) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [details?.codeExpiresAt]);
  useEffect(() => {
    setEntries(details?.students ?? []);
  }, [details]);
  useFocusEffect(useCallback(() => {
    if (catalog.mode !== 'live' || !details?.hasOpenCall) return undefined;
    const timer = setInterval(() => catalog.reload({ silent: true, force: true }), 8000);
    return () => clearInterval(timer);
  }, [catalog, details?.hasOpenCall]));
  useEffect(() => {
    if (catalog.mode !== 'live' || !details?.openSessionId || !details.codeExpiresAt || new Date(details.codeExpiresAt).getTime() <= Date.now()) {
      setCodes([]);
      setCodeMode(null);
      setCodeNotice(null);
      return undefined;
    }
    let active = true;
    let timer;
    let attempt = 0;
    const sessionId = details.openSessionId;
    const studentCount = details.students?.length ?? 0;
    const load = () => {
      ensureSessionCodes(sessionId).then(result => {
        if (!active) return;
        const loaded = result.codes ?? [];
        const ready = result.ok && result.mode && !(result.mode === 'codigo' && loaded.length === 0 && studentCount > 0);
        if (ready) {
          setCodes(loaded);
          setCodeMode(result.mode);
          setCodeNotice(result.message);
          return;
        }
        if (attempt < 4) {
          attempt += 1;
          timer = setTimeout(load, 2000);
          return;
        }
        setCodes(loaded);
        setCodeMode(result.mode ?? null);
        setCodeNotice(result.message ?? 'Não foi possível carregar os códigos desta chamada.');
      });
    };
    load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [catalog.mode, details?.codeExpiresAt, details?.openSessionId, details?.students]);
  if (!turmaId) {
    return <Screen tone="brand" title="Chamada" onBack={() => router.back()} safeBottom={false}>
        <LoadingState />
      </Screen>;
  }
  if (!details) {
    return <CatalogGate title="Chamada" onBack={() => router.back()}>
        <MissingRecord title="Chamada" />
      </CatalogGate>;
  }
  const live = catalog.mode === 'live';
  const countdown = details.codeExpiresAt ? remainingLabel(details.codeExpiresAt, new Date(now)) : null;
  const expired = countdown === 'QR Code vencido';
  const qrUrl = live && !expired ? publicCheckInUrl(process.env.EXPO_PUBLIC_CHECK_IN_URL, details.checkInToken) : null;
  const qrMessage = !live ? pendingMessages.qr : !publicCheckInOrigin(process.env.EXPO_PUBLIC_CHECK_IN_URL) ? pendingMessages.publicOrigin : expired ? pendingMessages.publicExpired : pendingMessages.publicToken;
  const current = details;
  const pending = entries.filter(entry => entry.pending).length;
  const counts = countMarks(entries.filter(entry => !entry.pending));
  const unrecorded = entries.filter(entry => entry.unrecorded).length;
  const todayLabel = formatAcademicDay(new Date().toISOString());
  const closedToday = live && !details.hasOpenCall && details.calledToday === true;
  const idle = live && !details.hasOpenCall && !closedToday;
  const statusNotice = notice ? null : closedToday ? {
    tone: 'info',
    message: 'A chamada de hoje foi encerrada. Uma nova chamada desta turma só poderá ser aberta no próximo dia.'
  } : idle ? {
    tone: 'info',
    message: `Não há chamada aberta nesta turma. A chamada de hoje será registrada em ${todayLabel}, no horário de Brasília.`
  } : !live && !details.hasOpenCall ? {
    tone: 'demo',
    message: pendingMessages.noOpenCall
  } : null;
  const badgeLabel = !live ? 'Pré-visualização' : details.hasOpenCall ? 'Chamada aberta' : closedToday ? 'Chamada encerrada' : 'Sem chamada';
  function codeFor(entry) {
    return codes.find(item => entry.roster ? item.rosterStudentId === entry.id : item.studentId === entry.id) ?? null;
  }
  async function copyCode(value) {
    const result = await copyText(formatAttendanceCode(value));
    if (!result.message) return;
    setNoticeTone(result.ok ? 'success' : 'warning');
    setNotice(result.message);
  }
  function cycle(id) {
    if (live) return;
    setEntries(currentEntries => currentEntries.map(entry => entry.id === id ? {
      ...entry,
      mark: entry.mark === 'presente' ? 'falta' : 'presente',
      timeLabel: 'prévia'
    } : entry));
  }
  async function openCall() {
    setBusy(true);
    setNotice(null);
    const result = await openClassSession(current.id);
    setBusy(false);
    if (!result.ok) {
      setNoticeTone('warning');
      setNotice(result.message);
      return;
    }
    setNoticeTone('success');
    setNotice(`Chamada aberta. O QR Code vale por ${CODE_VALID_MINUTES} minutos.`);
    catalog.reload({ silent: true, force: true });
  }
  async function closeCall() {
    if (!current.openSessionId) return;
    setBusy(true);
    setNotice(null);
    const result = await closeClassSession(current.openSessionId);
    setBusy(false);
    if (!result.ok) {
      setNoticeTone('warning');
      setNotice(result.message);
      return;
    }
    setNoticeTone('success');
    setNotice('Chamada encerrada. Quem estava matriculado e não confirmou ficou com falta.');
    catalog.reload({ silent: true, force: true });
  }
  return <CatalogGate title="Chamada" onBack={() => router.back()}>
    <Screen tone="brand" title="Área de chamada" subtitle={[details.groupName, details.period, details.discipline].filter(Boolean).join(' · ')} onBack={() => router.back()} safeBottom={false} notice={notice} noticeTone={noticeTone} onNoticeDismiss={() => setNotice(null)}>
      <View style={styles.status}>
        <Badge label={badgeLabel} tone="accent" />
        {details.hasOpenCall ? <Notice tone="info" message={details.sessionDateLabel ? `Data da chamada: ${details.sessionDateLabel}, no horário de Brasília.` : `A chamada de hoje será registrada em ${todayLabel}, no horário de Brasília.`} /> : null}
        {details.hasOpenCall && details.sessionValidLabel ? <CodePanel validLabel={details.sessionValidLabel} remainingLabel={countdown} qrMessage={qrMessage} qrValue={qrUrl} /> : null}
        {live && details.hasOpenCall && !expired && codeMode === 'codigo' ? <Notice tone="info" message="Os códigos individuais ficam só nesta lista. O QR Code projetado não os mostra. O aluno ainda pode repassar o próprio código." /> : null}
        {live && details.hasOpenCall && !expired && codeMode === 'matricula' ? <Notice tone="info" message="Esta chamada foi aberta antes dos códigos individuais. A confirmação dela continua pela matrícula até o encerramento." /> : null}
        {codeNotice ? <Notice tone="warning" message={codeNotice} /> : null}
        {statusNotice ? <Notice tone={statusNotice.tone} message={statusNotice.message} /> : null}
      </View>
      <View style={styles.stats}>
        <StatTile label="Presentes" value={String(counts.presente)} />
        {pending > 0 ? <StatTile label="Pendentes" value={String(pending)} /> : null}
        {pending === 0 ? <StatTile label="Faltas" value={String(counts.falta)} /> : null}
        <StatTile label="Justificadas" value={String(counts.justificada)} />
        {unrecorded > 0 ? <StatTile label="Sem registro" value={String(unrecorded)} /> : null}
      </View>
      {entries.length > 0 ? <Card>
          {live ? <AppText size="caption" tone="muted">
              {details.hasOpenCall ? 'A lista atualiza enquanto a chamada está aberta. Pendente ainda não é falta.' : closedToday ? 'Resultado dos alunos nesta chamada.' : 'Estes registros pertencem às chamadas já encerradas.'}
            </AppText> : <Notice message={pendingMessages.visualOnly} tone="demo" />}
          {entries.map(entry => {
            const individual = live && details.hasOpenCall && !expired ? codeFor(entry) : null;
            const visibleCode = shown[entry.id] === true;
            return <View key={entry.id}>
              <PersonRow name={entry.name} detail={entry.registrationCode ? `Matrícula ${entry.registrationCode}` : null} mark={entry.mark} pending={entry.pending} timeLabel={entry.timeLabel} onPress={live ? undefined : () => cycle(entry.id)} />
              {individual ? <View style={styles.codeRow}>
                  <AppText size="label">{visibleCode ? formatAttendanceCode(individual.code) : maskedAttendanceCode()}</AppText>
                  <AppText size="caption" tone="muted">{individual.used ? 'Código já utilizado' : 'Código desta chamada'}</AppText>
                  <View style={styles.codeActions}>
                    <Pressable accessibilityRole="button" accessibilityLabel={visibleCode ? `Ocultar código de ${entry.name}` : `Mostrar código de ${entry.name}`} onPress={() => setShown(current => ({ ...current, [entry.id]: !visibleCode }))}>
                      <AppText size="caption" tone="accent">{visibleCode ? 'Ocultar' : 'Mostrar'}</AppText>
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Copiar código de ${entry.name}`} onPress={() => void copyCode(individual.code)}>
                      <AppText size="caption" tone="accent">Copiar</AppText>
                    </Pressable>
                  </View>
                </View> : null}
            </View>;
          })}
        </Card> : null}
      {live && !details.hasOpenCall ? <Button label={busy ? 'Abrindo…' : 'Abrir chamada'} onPress={() => void openCall()} disabled={busy || details.calledToday === true} /> : null}
      {live && details.hasOpenCall ? <Button label={busy ? 'Encerrando…' : 'Encerrar chamada'} variant="secondary" onPress={() => void closeCall()} disabled={busy} /> : null}
      {!live ? <Button label="Encerrar chamada" variant="secondary" onPress={() => {
        setNoticeTone('demo');
        setNotice(pendingMessages.closeCall);
      }} accessibilityHint="Não encerra uma chamada real" /> : null}
    </Screen>
    </CatalogGate>;
}
const styles = StyleSheet.create({
  status: {
    gap: spacing.md
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  codeRow: {
    gap: spacing.xs,
    paddingBottom: spacing.sm
  },
  codeActions: {
    flexDirection: 'row',
    gap: spacing.md
  }
});
