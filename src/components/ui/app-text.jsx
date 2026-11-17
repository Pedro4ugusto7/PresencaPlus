import { Text } from 'react-native';
import { palette } from '@/theme';
const sizeStyles = {
  display: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800'
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700'
  },
  heading: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700'
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500'
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600'
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600'
  }
};
const toneColor = {
  default: palette.text,
  muted: palette.textMuted,
  inverse: palette.white,
  accent: palette.blue,
  present: palette.present,
  absent: palette.absent,
  warning: palette.warning,
  demo: palette.demo
};
export function AppText({
  tone = 'default',
  size = 'body',
  align,
  style,
  ...rest
}) {
  return <Text style={[sizeStyles[size], {
    color: toneColor[tone],
    textAlign: align
  }, style]} {...rest} />;
}
