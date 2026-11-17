import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { palette, radius } from '@/theme';
const tones = {
  present: {
    background: palette.presentSoft,
    color: palette.present
  },
  absent: {
    background: palette.absentSoft,
    color: palette.absent
  },
  justified: {
    background: palette.justifiedSoft,
    color: palette.justified
  },
  neutral: {
    background: '#EEF2F7',
    color: palette.textMuted
  },
  accent: {
    background: palette.accentSoft,
    color: palette.blue
  }
};
export function Badge({
  label,
  tone = 'neutral'
}) {
  const colors = tones[tone];
  return <View style={[styles.badge, {
    backgroundColor: colors.background
  }]}>
      <AppText size="caption" style={{
      color: colors.color
    }}>
        {label}
      </AppText>
    </View>;
}
const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start'
  }
});
