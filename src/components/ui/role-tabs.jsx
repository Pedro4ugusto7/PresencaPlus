import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { palette, spacing } from '@/theme';
export function RoleTabs({
  tabs
}) {
  const insets = useSafeAreaInsets();
  return <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <View style={StyleSheet.flatten([styles.bar, {
        paddingBottom: Math.max(insets.bottom, spacing.sm)
      }])}>
          {tabs.map(tab => <TabTrigger key={tab.name} name={tab.name} href={tab.href} resetOnFocus={false} asChild>
              <RoleTabButton label={tab.label} icon={tab.icon} />
            </TabTrigger>)}
        </View>
      </TabList>
    </Tabs>;
}
function RoleTabButton({
  label,
  icon,
  isFocused,
  ref: _slotRef,
  ...props
}) {
  const color = isFocused ? palette.white : palette.inverseMuted;
  void _slotRef;
  return <Pressable {...props} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{
    selected: Boolean(isFocused)
  }} style={styles.tab}>
      <AppIcon name={icon} color={color} size={22} />
      <AppText size="caption" style={{
      color
    }} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {label}
      </AppText>
    </Pressable>;
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.background
  },
  slot: {
    flex: 1
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
  }
});
