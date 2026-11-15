import { SymbolView } from 'expo-symbols';

import { palette } from '@/theme';

const icons = {
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  classes: { ios: 'person.3.fill', android: 'groups', web: 'groups' },
  subjects: { ios: 'book.fill', android: 'menu_book', web: 'menu_book' },
  reports: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' },
  profile: { ios: 'person.fill', android: 'person', web: 'person' },
  history: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' },
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  present: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  absent: { ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' },
  justified: { ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' },
  clock: { ios: 'clock.fill', android: 'schedule', web: 'schedule' },
  bell: { ios: 'bell.fill', android: 'notifications', web: 'notifications' },
  qr: { ios: 'qrcode', android: 'qr_code', web: 'qr_code' },
  lock: { ios: 'lock.fill', android: 'lock', web: 'lock' },
  mail: { ios: 'envelope.fill', android: 'mail', web: 'mail' },
  eye: { ios: 'eye.fill', android: 'visibility', web: 'visibility' },
  eyeOff: { ios: 'eye.slash.fill', android: 'visibility_off', web: 'visibility_off' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  info: { ios: 'info.circle.fill', android: 'info', web: 'info' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  leave: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  calendar: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  shield: { ios: 'shield.fill', android: 'shield', web: 'shield' },
  school: { ios: 'graduationcap.fill', android: 'school', web: 'school' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  room: { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' },
  call: { ios: 'checklist', android: 'fact_check', web: 'fact_check' },
} as const;

export type IconName = keyof typeof icons;

type AppIconProps = {
  name: IconName;
  color?: string;
  size?: number;
};

export function AppIcon({ name, color = palette.blue, size = 22 }: AppIconProps) {
  const symbol = icons[name];
  return (
    <SymbolView
      name={symbol}
      tintColor={color}
      size={size}
      fallback={<SymbolView name={{ ios: 'circle.fill', android: 'circle', web: 'circle' }} tintColor={color} size={size} />}
    />
  );
}
