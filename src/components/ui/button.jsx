import { Pressable, StyleSheet, View } from 'react-native';
import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { palette, radius, spacing } from '@/theme';
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  icon,
  accessibilityHint
}) {
  const iconColor = variant === 'primary' ? palette.white : palette.blue;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={accessibilityHint} accessibilityState={{
    disabled
  }} disabled={disabled} onPress={onPress} style={({
    pressed
  }) => [styles.base, styles[variant], disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
      <View style={styles.content}>
        {icon ? <AppIcon name={icon} color={iconColor} size={18} /> : null}
        <AppText size="label" tone={variant === 'primary' ? 'inverse' : 'accent'} style={styles.label}>
          {label}
        </AppText>
      </View>
    </Pressable>;
}
const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  label: {
    textAlign: 'center'
  },
  primary: {
    backgroundColor: palette.blue
  },
  secondary: {
    backgroundColor: palette.surface,
    borderWidth: 1.5,
    borderColor: palette.blue
  },
  ghost: {
    backgroundColor: 'transparent'
  },
  disabled: {
    opacity: 0.45
  },
  pressed: {
    opacity: 0.88
  }
});
