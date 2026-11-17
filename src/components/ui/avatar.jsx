import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { palette } from '@/theme';
function initials(name) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(part => part.charAt(0).toUpperCase()).join('');
}
export function Avatar({
  name,
  size = 40
}) {
  return <View accessibilityLabel={`Avatar de ${name}`} style={[styles.avatar, {
    width: size,
    height: size,
    borderRadius: size / 2
  }]}>
      <AppText size="caption" tone="inverse">
        {initials(name)}
      </AppText>
    </View>;
}
const styles = StyleSheet.create({
  avatar: {
    backgroundColor: palette.blue,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
