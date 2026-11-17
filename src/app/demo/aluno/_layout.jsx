import { Redirect } from 'expo-router';
import { toHref } from '@/navigation/area-paths';
export const unstable_settings = {
  anchor: '(tabs)'
};
export default function StudentLayout() {
  return <Redirect href={toHref('/login')} />;
}
