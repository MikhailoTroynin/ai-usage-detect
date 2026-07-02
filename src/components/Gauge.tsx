import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface GaugeProps {
  value: number;
  max?: number;
  size?: number;
  label?: string;
  sub?: string;
  color: string;
  track?: string;
  thickness?: number;
  big?: boolean;
}

export function Gauge({ value, max = 100, size = 132, label, sub, color, track, thickness = 11, big }: GaugeProps) {
  const { theme } = useTheme();
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: pct, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }, 60);
    return () => clearTimeout(t);
  }, [pct]);

  const strokeDashoffset = anim.interpolate({ inputRange: [0, 1], outputRange: [circ, 0] });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track ?? theme.surface2} strokeWidth={thickness} />
          <AnimatedCircle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={thickness}
            strokeLinecap="round" strokeDasharray={`${circ}, ${circ}`} strokeDashoffset={strokeDashoffset}
          />
        </G>
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: big ? 38 : 30, fontWeight: '800', color: theme.text, letterSpacing: -1 }}>
          {label !== undefined ? label : `${Math.round(value)}%`}
        </Text>
        {sub && <Text style={{ fontSize: 11.5, color: theme.textMuted, marginTop: 4, fontWeight: '600' }}>{sub}</Text>}
      </View>
    </View>
  );
}
