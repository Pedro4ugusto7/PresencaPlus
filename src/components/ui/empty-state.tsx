import { StyleSheet, View } from 'react-native';

import { AppIcon, type IconName } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { palette, spacing } from '@/theme';

type EmptyStateProps = {
  icon?: IconName;
  title: string;
  description: string;
};

export function EmptyState({ icon = 'search', title, description }: EmptyStateProps) {
  return (
    <View style={styles.box}>
      <AppIcon name={icon} size={28} color={palette.accent} />
      <AppText size="heading" align="center">
        {title}
      </AppText>
      <AppText size="label" tone="muted" align="center">
        {description}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
});
