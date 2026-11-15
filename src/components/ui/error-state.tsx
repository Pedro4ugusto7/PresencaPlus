import { StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { palette, spacing } from '@/theme';

type ErrorStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ErrorState({ title, description, actionLabel, onAction }: ErrorStateProps) {
  return (
    <View style={styles.box}>
      <AppIcon name="warning" size={32} color={palette.absent} />
      <AppText size="heading" align="center">
        {title}
      </AppText>
      <AppText size="label" tone="muted" align="center">
        {description}
      </AppText>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
});
