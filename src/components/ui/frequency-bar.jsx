import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { palette, radius, spacing } from '@/theme';
const barColor = {
  good: palette.presentBar,
  warning: '#D97706',
  critical: palette.absentBar
};
export function FrequencyBar({
  percent,
  tone,
  label = 'Frequência'
}) {
  const width = `${Math.max(0, Math.min(100, percent))}%`;
  return <View accessibilityLabel={`${label}: ${percent} por cento`}>
      <View style={styles.row}>
        <AppText size="caption" tone="muted">
          {label}
        </AppText>
        <AppText size="caption" tone={tone === 'critical' ? 'absent' : tone === 'warning' ? 'warning' : 'present'}>
          {percent}%
        </AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, {
        width,
        backgroundColor: barColor[tone]
      }]} />
      </View>
    </View>;
}
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: '#E6EDF6',
    overflow: 'hidden'
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill
  }
});
