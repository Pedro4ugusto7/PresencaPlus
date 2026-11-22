import { StyleSheet, View } from 'react-native';
import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { palette, radius, spacing } from '@/theme';
const tones = {
  info: {
    background: palette.accentSoft,
    border: '#B9DCFA',
    text: 'accent'
  },
  warning: {
    background: palette.warningSoft,
    border: '#F5C7B0',
    text: 'warning'
  },
  demo: {
    background: palette.demoSoft,
    border: palette.demoBorder,
    text: 'demo'
  },
  success: {
    background: palette.presentSoft,
    border: '#B7E7D4',
    text: 'present'
  }
};
const icons = {
  info: 'info',
  warning: 'warning',
  demo: 'info',
  success: 'check'
};
export function Notice({
  message,
  tone = 'info'
}) {
  const colors = tones[tone] ?? tones.info;
  return <View accessibilityRole={tone === 'info' || tone === 'demo' ? 'text' : 'alert'} style={[styles.box, {
    backgroundColor: colors.background,
    borderColor: colors.border
  }]}>
      <AppIcon name={icons[tone] ?? 'info'} color={palette[colors.text === 'accent' ? 'accent' : colors.text] ?? palette.accent} size={18} />
      <AppText size="label" tone={colors.text} style={styles.message}>
        {message}
      </AppText>
    </View>;
}
const styles = StyleSheet.create({
  box: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm
  },
  message: {
    flex: 1
  }
});
