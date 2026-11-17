import { useLocalSearchParams } from 'expo-router';
export function useRouteParam(name) {
  const params = useLocalSearchParams();
  const value = params[name];
  if (typeof value === 'string' && value.length > 0) return value;
  return undefined;
}
