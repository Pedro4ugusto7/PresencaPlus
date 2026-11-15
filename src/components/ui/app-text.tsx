import { Text, type TextProps, type TextStyle } from 'react-native';

import { palette } from '@/theme';

type Tone = 'default' | 'muted' | 'inverse' | 'accent' | 'present' | 'absent' | 'warning' | 'demo';
type Size = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption';

const sizeStyles: Record<Size, TextStyle> = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '500' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
};

const toneColor: Record<Tone, string> = {
  default: palette.text,
  muted: palette.textMuted,
  inverse: palette.white,
  accent: palette.blue,
  present: palette.present,
  absent: palette.absent,
  warning: palette.warning,
  demo: palette.demo,
};

type AppTextProps = TextProps & {
  tone?: Tone;
  size?: Size;
  align?: TextStyle['textAlign'];
};

export function AppText({
  tone = 'default',
  size = 'body',
  align,
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      style={[sizeStyles[size], { color: toneColor[tone], textAlign: align }, style]}
      {...rest}
    />
  );
}
