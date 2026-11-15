import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { frequencyTone } from '@/domain';
import { palette, radius, spacing } from '@/theme';

type BarChartProps = {
  items: { label: string; percent: number }[];
  caption: string;
};

const fillFor = {
  good: palette.presentBar,
  warning: '#D97706',
  critical: palette.absentBar,
} as const;

export function BarChart({ items, caption }: BarChartProps) {
  return (
    <View accessibilityLabel={caption}>
      <View style={styles.chart}>
        {items.map((item) => (
          <View key={item.label} style={styles.column}>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    height: `${Math.max(6, Math.min(100, item.percent))}%`,
                    backgroundColor: fillFor[frequencyTone(item.percent)],
                  },
                ]}
              />
            </View>
            <AppText size="caption" tone="muted">
              {item.label}
            </AppText>
            <AppText size="caption">{item.percent}%</AppText>
          </View>
        ))}
      </View>
      <AppText size="caption" tone="muted">
        {caption}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    height: 160,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  track: {
    width: '70%',
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#E6EDF6',
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    borderRadius: radius.sm,
  },
});
