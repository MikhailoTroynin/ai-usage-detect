import React from 'react';
import { View } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeContext';

export function Logo({ size = 40 }: { size?: number }) {
  const { theme } = useTheme();
  return (
    <View style={{
      width: size, height: size, borderRadius: size * 0.28,
      backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name="wand" size={size * 0.56} stroke="#fff" sw={1.9} />
    </View>
  );
}
