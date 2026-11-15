import { StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { formatSessionCode } from '@/domain';
import { palette, radius, spacing } from '@/theme';

type CodePanelProps = {
  code: string;
  validLabel: string;
  qrMessage: string;
};

export function CodePanel({ code, validLabel, qrMessage }: CodePanelProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.qr}>
        <AppIcon name="qr" size={42} color={palette.blue} />
        <AppText size="caption" tone="muted" align="center">
          {qrMessage}
        </AppText>
      </View>
      <AppText size="caption" tone="muted" align="center">
        Código da aula
      </AppText>
      <AppText size="display" tone="accent" align="center" accessibilityLabel={`Código ${formatSessionCode(code)}`}>
        {formatSessionCode(code)}
      </AppText>
      <AppText size="caption" tone="muted" align="center">
        {validLabel}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: 'center',
  },
  qr: {
    width: '100%',
    minHeight: 140,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.border,
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
});
