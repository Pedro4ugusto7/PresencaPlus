import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { DemoBanner } from '@/components/ui/demo-banner';
import { useDemoMode } from '@/state/demo-mode';
import { hitSlop, maxContentWidth, palette, spacing } from '@/theme';
export function Screen({
  children,
  title,
  subtitle,
  onBack,
  tone = 'plain',
  scroll = true,
  keyboard = false,
  safeBottom = true
}) {
  const insets = useSafeAreaInsets();
  const demo = useDemoMode();
  const brand = tone === 'brand';
  const contentInset = {
    paddingLeft: insets.left + spacing.lg,
    paddingRight: insets.right + spacing.lg
  };
  const body = scroll ? <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <View style={[styles.content, contentInset]}>{children}</View>
    </ScrollView> : <View style={[styles.flex, styles.content, contentInset]}>{children}</View>;
  const framed = keyboard ? <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {body}
    </KeyboardAvoidingView> : body;
  return <View style={[styles.flex, {
    backgroundColor: palette.background,
    paddingBottom: safeBottom ? insets.bottom : 0
  }]}>
      <StatusBar style={brand ? 'light' : 'dark'} />
      {brand ? <View style={[styles.header, {
      paddingTop: insets.top + spacing.md,
      paddingLeft: insets.left + spacing.lg,
      paddingRight: insets.right + spacing.lg
    }]}>
          <View style={styles.headerRow}>
            {onBack ? <Pressable accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={hitSlop} onPress={onBack} style={styles.back}>
                <AppIcon name="back" color={palette.white} size={22} />
              </Pressable> : <AppText size="label" tone="inverse">
                Presença+
              </AppText>}
          </View>
          {title ? <AppText size="title" tone="inverse" accessibilityRole="header">
              {title}
            </AppText> : null}
          {subtitle ? <AppText size="label" style={styles.subtitle}>
              {subtitle}
            </AppText> : null}
        </View> : null}
      {demo ? <DemoBanner /> : null}
      <View style={[styles.flex, !brand && {
      paddingTop: insets.top
    }]}>{framed}</View>
    </View>;
}
const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  header: {
    backgroundColor: palette.blue,
    paddingBottom: spacing.lg,
    gap: spacing.xs
  },
  headerRow: {
    minHeight: 32,
    justifyContent: 'center'
  },
  back: {
    width: 44,
    height: 44,
    marginLeft: -spacing.sm,
    alignItems: 'center',
    justifyContent: 'center'
  },
  subtitle: {
    color: palette.inverseMuted
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: spacing.xxl
  },
  content: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    paddingTop: spacing.lg,
    gap: spacing.lg
  }
});
