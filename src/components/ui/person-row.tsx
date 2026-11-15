import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AppText } from '@/components/ui/app-text';
import type { AttendanceMark } from '@/domain';
import { markLabel } from '@/domain';
import { palette, spacing } from '@/theme';

const badgeTone = {
  presente: 'present',
  falta: 'absent',
  justificada: 'justified',
} as const;

type PersonRowProps = {
  name: string;
  mark: AttendanceMark;
  timeLabel: string;
  onPress?: () => void;
};

export function PersonRow({ name, mark, timeLabel, onPress }: PersonRowProps) {
  const content = (
    <>
      <Avatar name={name} />
      <View style={styles.text}>
        <AppText size="label" numberOfLines={2}>
          {name}
        </AppText>
        <AppText size="caption" tone="muted">
          {timeLabel}
        </AppText>
      </View>
      <Badge label={markLabel(mark)} tone={badgeTone[mark]} />
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${markLabel(mark)}. Toque para alternar a pré-visualização.`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.75,
  },
});
