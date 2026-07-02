import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeContext';

interface HeaderProps {
  title: string;
  sub?: string;
  trailing?: React.ReactNode;
  onBack?: () => void;
}

export function Header({ title, sub, trailing, onBack }: HeaderProps) {
  const { theme } = useTheme();
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      {onBack && (
        <Pressable onPress={onBack} style={{
          borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, width: 38, height: 38,
          borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2,
        }}>
          <Icon name="chevL" size={20} stroke={theme.text} />
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: -0.8, color: theme.text, lineHeight: 32 }}>{title}</Text>
        {sub && <Text style={{ fontSize: 14, color: theme.textMuted, marginTop: 5, letterSpacing: -0.1 }}>{sub}</Text>}
      </View>
      {trailing}
    </View>
  );
}
