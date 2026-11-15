import { StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { palette, radius } from '@/theme';

type LogoMarkProps = {
  size?: number;
  variant?: 'onBrand' | 'onLight';
};

export function LogoMark({ size = 72, variant = 'onBrand' }: LogoMarkProps) {
  const onBrand = variant === 'onBrand';
  return (
    <View
      accessibilityLabel="Presença+"
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: onBrand ? palette.white : palette.blue,
        },
      ]}>
      <AppIcon name="classes" size={size * 0.46} color={onBrand ? palette.blue : palette.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
