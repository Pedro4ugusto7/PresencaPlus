import { Stack } from 'expo-router';
import { ProfessorShell } from '@/components/ui/professor-shell';
import { DemoCatalogProvider } from '@/state/catalog';
import { palette } from '@/theme';
export const unstable_settings = {
  anchor: '(tabs)'
};
export default function ProfessorLayout() {
  return <DemoCatalogProvider role="professor">
      <ProfessorShell area="demo">
        <Stack screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: palette.background
        }
      }} />
      </ProfessorShell>
    </DemoCatalogProvider>;
}
