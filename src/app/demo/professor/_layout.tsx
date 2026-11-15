import { Stack } from 'expo-router';

import { palette } from '@/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function ProfessorLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.background },
      }}
    />
  );
}
