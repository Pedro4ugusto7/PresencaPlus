import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { palette, radius, spacing } from '@/theme';
export function CodePanel({
  validLabel,
  remainingLabel,
  qrMessage,
  qrValue
}) {
  return <View style={styles.panel}>
      <View style={styles.qr}>
        {qrValue ? <QRCode value={qrValue} size={168} color={palette.blue} backgroundColor={palette.white} /> : <>
            <AppIcon name="qr" size={42} color={palette.blue} />
            <AppText size="caption" tone="muted" align="center">
              {qrMessage}
            </AppText>
          </>}
      </View>
      <AppText size="caption" tone="muted" align="center">
        QR Code da chamada
      </AppText>
      {remainingLabel ? <AppText size="heading" tone="accent" align="center">
          {remainingLabel}
        </AppText> : null}
      {validLabel ? <AppText size="caption" tone="muted" align="center">
          {validLabel}
        </AppText> : null}
    </View>;
}
const styles = StyleSheet.create({
  panel: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: 'center'
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
    marginBottom: spacing.sm
  }
});
