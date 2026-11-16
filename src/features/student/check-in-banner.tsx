import { Badge } from '@/components/ui/badge';
import { AppText } from '@/components/ui/app-text';
import { Notice } from '@/components/ui/notice';
import type { CheckInView } from '@/domain';

export function CheckInBanner({ view }: { view: CheckInView }) {
  if (!view.badge && !view.message && !view.priorMessage) return null;
  const noticeTone = view.kind === 'confirmed' || view.kind === 'justified' ? 'info' : 'warning';
  return (
    <>
      {view.badge ? <Badge label={view.badge} tone={view.badgeTone} /> : null}
      {view.message ? <Notice message={view.message} tone={noticeTone} /> : null}
      {view.dateLabel && view.kind !== 'pending' && view.kind !== 'none' ? (
        <AppText size="caption" tone="muted">
          Data da aula: {view.dateLabel}
        </AppText>
      ) : null}
      {view.priorMessage ? <Notice message={view.priorMessage} /> : null}
    </>
  );
}
