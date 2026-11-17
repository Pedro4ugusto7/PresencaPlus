import { Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { palette, radius, spacing } from '@/theme';
export function Chip({
  label,
  selected,
  onPress
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{
    selected
  }} accessibilityLabel={label} onPress={onPress} style={({
    pressed
  }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}>
      <AppText size="caption" tone={selected ? 'inverse' : 'accent'}>
        {label}
      </AppText>
    </Pressable>;
}
const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center'
  },
  selected: {
    backgroundColor: palette.blue,
    borderColor: palette.blue
  },
  pressed: {
    opacity: 0.86
  }
});
