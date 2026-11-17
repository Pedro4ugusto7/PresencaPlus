import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { palette, spacing } from '@/theme';
export function DemoBanner() {
  return <View accessibilityRole="text" style={styles.banner}>
      <AppText size="caption" tone="demo" align="center">
        Modo demonstração · dados locais · sem autenticação
      </AppText>
    </View>;
}
const styles = StyleSheet.create({
  banner: {
    backgroundColor: palette.demoSoft,
    borderBottomWidth: 1,
    borderBottomColor: palette.demoBorder,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  }
});
