import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface MeterProps {
  value: number;
  max?: number;
  color?: string;
  track?: string;
  h?: number;
}

export function Meter({ value, max = 100, color, track, h = 8 }: MeterProps) {
  const { theme } = useTheme();
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 800, useNativeDriver: false }).start();
  }, [pct]);

  return (
    <View style={{ height: h, backgroundColor: track ?? theme.surface2, borderRadius: 999, overflow: 'hidden', width: '100%' }}>
      <Animated.View style={{
        height: '100%',
        width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
        backgroundColor: color ?? theme.accent,
        borderRadius: 999,
      }} />
    </View>
  );
}
