import React from 'react';
import { Pressable, Text, ViewStyle, StyleProp } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeContext';

type Variant = 'primary' | 'soft' | 'ghost' | 'dark';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: string;
  full?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const SIZES: Record<Size, { h: number; fs: number; px: number; gap: number }> = {
  sm: { h: 38, fs: 14, px: 14, gap: 7 },
  md: { h: 50, fs: 16, px: 18, gap: 9 },
  lg: { h: 56, fs: 17, px: 22, gap: 10 },
};

export function Button({ children, onPress, variant = 'primary', size = 'md', icon, full, disabled, style }: ButtonProps) {
  const { theme } = useTheme();
  const s = SIZES[size];
  const variants: Record<Variant, { bg: string; color: string; border: string }> = {
    primary: { bg: theme.accent, color: '#fff', border: 'transparent' },
    soft:    { bg: theme.accentSoft, color: theme.accent, border: 'transparent' },
    ghost:   { bg: 'transparent', color: theme.text, border: theme.border },
    dark:    { bg: theme.text, color: theme.surface, border: 'transparent' },
  };
  const v = variants[variant];

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        {
          height: s.h,
          paddingHorizontal: s.px,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: s.gap,
          borderRadius: theme.radii.md,
          backgroundColor: v.bg,
          borderWidth: v.border === 'transparent' ? 0 : 1,
          borderColor: v.border,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          alignSelf: full ? 'stretch' : 'flex-start',
          width: full ? '100%' : undefined,
          transform: [{ scale: pressed && !disabled ? 0.975 : 1 }],
        },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={s.fs + 3} sw={2} stroke={v.color} />}
      <Text style={{ fontSize: s.fs, fontWeight: '600', color: v.color, letterSpacing: -0.2 }}>{children}</Text>
    </Pressable>
  );
}
