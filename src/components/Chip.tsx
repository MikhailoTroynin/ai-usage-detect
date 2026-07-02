import React from 'react';
import { View, Text, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Risk } from '../data/content';

interface ChipProps {
  children: React.ReactNode;
  color?: string;
  bg?: string;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}

export function Chip({ children, color, bg, style, icon }: ChipProps) {
  const { theme } = useTheme();
  return (
    <View style={[{
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: bg ?? theme.surface2, paddingHorizontal: 9, paddingVertical: 4,
      borderRadius: 999, alignSelf: 'flex-start',
    }, style]}>
      {icon}
      <Text style={{ fontSize: 12, fontWeight: '600', color: color ?? theme.textMuted, letterSpacing: -0.1 }}>{children}</Text>
    </View>
  );
}

export function useRisk() {
  const { theme } = useTheme();
  const RISK: Record<Risk, { c: string; bg: string; label: string }> = {
    red:   { c: theme.riskRed,   bg: theme.riskRedBg,   label: 'Likely AI' },
    amber: { c: theme.riskAmber, bg: theme.riskAmberBg, label: 'Mixed' },
    green: { c: theme.riskGreen, bg: theme.riskGreenBg, label: 'Human' },
  };
  return RISK;
}
