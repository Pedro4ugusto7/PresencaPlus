import { Pressable, StyleSheet, View } from 'react-native';
import { cardShadow, palette, radius, spacing } from '@/theme';
export function Card({
  children,
  onPress,
  accessibilityLabel
}) {
  if (!onPress) {
    return <View style={styles.card}>{children}</View>;
  }
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({
    pressed
  }) => [styles.card, pressed && styles.pressed]}>
      {children}
    </Pressable>;
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...cardShadow
  },
  pressed: {
    opacity: 0.94
  }
});
