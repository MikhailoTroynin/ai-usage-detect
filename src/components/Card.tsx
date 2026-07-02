import React from 'react';
import { Pressable, View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  pad?: number;
}

export function Card({ children, style, onPress, pad = 16 }: CardProps) {
  const { theme } = useTheme();
  const content = (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderRadius: theme.radii.lg,
          borderWidth: 1,
          borderColor: theme.border,
          padding: pad,
          shadowColor: '#000',
          shadowOpacity: theme.shadowOpacity,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {content}
    </Pressable>
  );
}
