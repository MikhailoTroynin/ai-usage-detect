import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { ICONS } from '../data/icons';
import { useTheme } from '../theme/ThemeContext';

interface IconProps {
  name: string;
  size?: number;
  stroke?: string;
  sw?: number;
  fill?: string;
}

export function Icon({ name, size = 22, stroke, sw = 1.8, fill = 'none' }: IconProps) {
  const { theme } = useTheme();
  const d = ICONS[name];
  if (!d) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
      <Path
        d={d}
        stroke={stroke ?? theme.text}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={fill}
      />
    </Svg>
  );
}
