import { Platform } from 'react-native';

/**
 * Identidade visual do Presença+.
 * Azul institucional e superfícies claras, com pares de cor pensados para contraste.
 */
export const palette = {
  blue: '#073B91',
  bluePressed: '#052C6E',
  accent: '#0B8FF9',
  accentSoft: '#E7F3FE',
  background: '#F7F9FD',
  surface: '#FFFFFF',
  text: '#122033',
  textMuted: '#3E4C63',
  border: '#D9E3F0',
  present: '#0B7A56',
  presentSoft: '#E7F8F1',
  presentBar: '#13B981',
  absent: '#B42318',
  absentSoft: '#FDECEC',
  absentBar: '#EF4444',
  justified: '#9A5410',
  justifiedSoft: '#FEF4E6',
  warning: '#9A3412',
  warningSoft: '#FFF4ED',
  demo: '#8A4B08',
  demoSoft: '#FFF7E8',
  demoBorder: '#F3D7A1',
  white: '#FFFFFF',
  inverseMuted: 'rgba(255,255,255,0.78)',
  shadow: '#073B91'
};
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32
};
export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999
};
export const maxContentWidth = 720;
export const hitSlop = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10
};
export const cardShadow = Platform.select({
  ios: {
    shadowColor: palette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8
    }
  },
  android: {
    elevation: 2
  },
  default: {
    boxShadow: '0 8px 24px rgba(7, 59, 145, 0.08)'
  }
}) ?? {};
