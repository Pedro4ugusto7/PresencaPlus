import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { countMarks } from '@/domain';
import { closeClassSession, openClassSession } from '@/data/remote/attendance-ops';
import { publicCheckInOrigin, publicCheckInUrl, remainingLabel } from '@/domain/public-check-in';
import { CODE_VALID_MINUTES, DAILY_CALL_MESSAGE } from '@/domain/session-policy';
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
    const timer = setInterval(() => catalog.reload(true), 8000);
    return () => clearInterval(timer);
  }, [catalog, details?.hasOpenCall]));
  if (!turmaId) {
    return <Screen tone="brand" title="Chamada" onBack={() => router.back()}>
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
    setNoticeTone('info');
    setNotice(`Chamada aberta. O QR Code vale por ${CODE_VALID_MINUTES} minutos.`);
    catalog.reload(true);
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
    setNoticeTone('info');
    setNotice('Chamada encerrada. Quem não confirmou ficou com falta.');
    catalog.reload();
  }
  return <CatalogGate title="Chamada" onBack={() => router.back()}>
    <Screen tone="brand" title="Área de chamada" subtitle={[details.groupName, details.period, details.discipline].filter(Boolean).join(' · ')} onBack={() => router.back()}>
      <Badge label={live ? details.hasOpenCall ? 'Chamada aberta' : 'Sem chamada' : 'Pré-visualização'} tone="accent" />
      {details.hasOpenCall && details.sessionValidLabel ? <CodePanel validLabel={details.sessionValidLabel} remainingLabel={countdown} qrMessage={qrMessage} qrValue={qrUrl} /> : <Notice message={live ? 'Não há chamada aberta nesta turma.' : pendingMessages.noOpenCall} tone="warning" />}
      <View style={styles.stats}>
        <StatTile label="Presentes" value={String(counts.presente)} />
        {pending > 0 ? <StatTile label="Pendentes" value={String(pending)} /> : null}
        {pending === 0 ? <StatTile label="Faltas" value={String(counts.falta)} /> : null}
        <StatTile label="Justificadas" value={String(counts.justificada)} />
      </View>
      {entries.length > 0 ? <Card>
          {live ? <AppText size="caption" tone="muted">
              {details.hasOpenCall ? 'A lista atualiza enquanto a chamada está aberta. Pendente ainda não é falta.' : 'Estes registros pertencem às chamadas já encerradas.'}
            </AppText> : <Notice message={pendingMessages.visualOnly} tone="demo" />}
          {entries.map(entry => <PersonRow key={entry.id} name={entry.name} detail={entry.registrationCode ? `Matrícula ${entry.registrationCode}` : null} mark={entry.mark} pending={entry.pending} timeLabel={entry.timeLabel} onPress={live ? undefined : () => cycle(entry.id)} />)}
        </Card> : null}
      {live && !details.hasOpenCall ? <>
          <Button label={busy ? 'Abrindo…' : 'Abrir chamada'} onPress={() => void openCall()} disabled={busy || details.calledToday === true} />
          {details.calledToday ? <Notice message={DAILY_CALL_MESSAGE} tone="warning" /> : null}
        </> : null}
      {live && details.hasOpenCall ? <Button label={busy ? 'Encerrando…' : 'Encerrar chamada'} variant="secondary" onPress={() => void closeCall()} disabled={busy} /> : null}
      {!live ? <Button label="Encerrar chamada" variant="secondary" onPress={() => {
        setNoticeTone('warning');
        setNotice(pendingMessages.closeCall);
      }} accessibilityHint="Não encerra uma chamada real" /> : null}
      {notice ? <Notice message={notice} tone={noticeTone === 'info' ? 'info' : 'warning'} /> : null}
    </Screen>
    </CatalogGate>;
}
const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  }
});
