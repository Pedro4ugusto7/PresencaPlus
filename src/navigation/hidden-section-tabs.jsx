import { StyleSheet } from 'react-native';
import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { professorSections } from '@/navigation/professor-sections';
export function HiddenSectionTabs({
  area
}) {
  const sections = professorSections(area).filter(section => section.tab);
  return <Tabs style={styles.root} activityEnabled>
      <TabSlot style={styles.root} />
      <TabList style={styles.hidden}>
        {sections.map(section => <TabTrigger key={section.id} name={section.id} href={section.href} resetOnFocus={false} />)}
      </TabList>
    </Tabs>;
}
const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden'
  }
});
