import { Pressable, StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { professorSections, selectedProfessorSection } from '@/navigation/professor-sections';
import { palette, spacing } from '@/theme';
export function ProfessorShell({
  area,
  children
}) {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sections = professorSections(area);
  const selected = selectedProfessorSection(area, pathname);
  return <View style={styles.root}>
      <View style={styles.body}>{children}</View>
      <View style={[styles.bar, {
      paddingBottom: Math.max(insets.bottom, spacing.sm)
    }]}>
        {sections.map(section => {
        const active = section.id === selected;
        const color = active ? palette.white : palette.inverseMuted;
        return <Pressable key={section.id} accessibilityRole="tab" accessibilityLabel={section.label} accessibilityState={{
          selected: active
        }} onPress={() => router.navigate(section.href)} style={styles.tab}>
              <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.iconSlot}>
                <AppIcon name={section.icon} color={color} size={22} />
              </View>
              <AppText size="caption" style={[styles.label, { color }]} numberOfLines={2}>
                {section.label}
              </AppText>
            </Pressable>;
      })}
      </View>
    </View>;
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    backgroundColor: palette.background
  },
  body: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden'
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: palette.blue,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs
  },
  tab: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 2
  },
  iconSlot: {
    width: 22,
    height: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },
  label: {
    textAlign: 'center',
    fontVariant: ['no-common-ligatures']
  }
});
