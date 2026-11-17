import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { palette, spacing } from '@/theme';
export function InfoRow({
  label,
  value
}) {
  return <View style={styles.row}>
      <AppText size="caption" tone="muted">
        {label}
      </AppText>
      <AppText size="label">{value}</AppText>
    </View>;
}
const styles = StyleSheet.create({
  row: {
    gap: 2,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border
  }
});
