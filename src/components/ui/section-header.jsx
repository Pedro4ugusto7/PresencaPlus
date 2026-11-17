import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { hitSlop, palette, spacing } from '@/theme';
export function SectionHeader({
  title,
  actionLabel,
  onAction
}) {
  return <View style={styles.row}>
      <AppText size="heading" style={styles.title} accessibilityRole="header">
        {title}
      </AppText>
      {actionLabel && onAction ? <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} hitSlop={hitSlop} onPress={onAction}>
          <AppText size="label" tone="accent">
            {actionLabel}
          </AppText>
        </Pressable> : null}
    </View>;
}
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  title: {
    flex: 1,
    color: palette.text
  }
});
