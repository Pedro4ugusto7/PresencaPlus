import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { palette, spacing } from '@/theme';
export function LoadingState({
  message = 'Carregando pré-visualização…'
}) {
  return <View accessibilityRole="progressbar" style={styles.box}>
      <ActivityIndicator color={palette.blue} size="large" />
      <AppText size="label" tone="muted" align="center">
        {message}
      </AppText>
    </View>;
}
const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
    minHeight: 220
  }
});
