import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { hitSlop, palette, radius, spacing } from '@/theme';
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secure = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoComplete = 'off',
  textContentType = 'none',
  maxLength,
  editable = true
}) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secure);
  return <View style={styles.wrap}>
      <AppText size="label" tone="muted">
        {label}
      </AppText>
      <View style={[styles.field, focused && styles.focused, error ? styles.invalid : null, !editable && styles.locked]}>
        <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#7C8BA1" secureTextEntry={hidden} keyboardType={keyboardType} autoCapitalize={autoCapitalize} autoCorrect={false} autoComplete={autoComplete} textContentType={textContentType} maxLength={maxLength} editable={editable} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} accessibilityLabel={label} accessibilityState={{
        disabled: !editable
      }} style={styles.input} />
        {secure ? <Pressable accessibilityRole="button" accessibilityLabel={hidden ? 'Mostrar senha' : 'Ocultar senha'} hitSlop={hitSlop} onPress={() => setHidden(current => !current)} style={styles.reveal}>
            <AppIcon name={hidden ? 'eye' : 'eyeOff'} size={20} color={palette.textMuted} />
          </Pressable> : null}
      </View>
      {error ? <AppText size="caption" tone="absent">
          {error}
        </AppText> : null}
    </View>;
}
const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm
  },
  field: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md
  },
  focused: {
    borderColor: palette.accent
  },
  invalid: {
    borderColor: palette.absentBar
  },
  locked: {
    opacity: 0.55
  },
  input: {
    flex: 1,
    color: palette.text,
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: spacing.md
  },
  reveal: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
