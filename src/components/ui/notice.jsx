import { StyleSheet, View } from 'react-native';
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
export function Notice({
  message,
  tone = 'info'
}) {
  const colors = tones[tone];
  return <View accessibilityRole="text" style={[styles.box, {
    backgroundColor: colors.background,
    borderColor: colors.border
  }]}>
      <AppText size="label" tone={colors.text}>
        {message}
      </AppText>
    </View>;
}
const styles = StyleSheet.create({
  box: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md
  }
});
