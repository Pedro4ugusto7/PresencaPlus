import { StyleSheet, TextInput, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { palette, radius, spacing } from '@/theme';

type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
};

export function SearchField({ value, onChangeText, placeholder }: SearchFieldProps) {
  return (
    <View style={styles.field}>
      <AppIcon name="search" size={18} color={palette.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#7C8BA1"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={placeholder}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    color: palette.text,
    fontSize: 16,
    paddingVertical: spacing.sm,
  },
});
