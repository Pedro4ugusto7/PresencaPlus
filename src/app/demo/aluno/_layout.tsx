import { Stack } from 'expo-router';

import { DemoCatalogProvider } from '@/state/catalog';
import { palette } from '@/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function StudentLayout() {
  return (
    <DemoCatalogProvider role="aluno">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
        }}
      />
    </DemoCatalogProvider>
  );
}
