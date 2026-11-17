import { Stack } from 'expo-router';
import { DemoModeProvider } from '@/state/demo-mode';
import { palette } from '@/theme';
export default function DemoLayout() {
  return <DemoModeProvider>
      <Stack screenOptions={{
      headerShown: false,
      contentStyle: {
        backgroundColor: palette.background
      }
    }} />
    </DemoModeProvider>;
}
