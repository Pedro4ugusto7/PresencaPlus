import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { palette, radius, spacing } from '@/theme';

type StatTileProps = {
  label: string;
  value: string;
  hint?: string;
};

export function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <View style={styles.tile} accessibilityLabel={`${label}: ${value}`}>
      <AppText size="caption" tone="muted">
        {label}
      </AppText>
      <AppText size="title" tone="accent">
        {value}
      </AppText>
      {hint ? (
        <AppText size="caption" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 96,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
});
