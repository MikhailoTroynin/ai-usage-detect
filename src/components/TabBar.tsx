import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeContext';
import { ScreenName } from '../navigation/types';

const TABS = [
  { id: 'home' as const,     icon: 'home',   label: 'Home' },
  { id: 'detector' as const, icon: 'detect', label: 'Detect' },
  { id: 'humanize' as const, icon: 'wand',   label: 'Humanize', center: true },
  { id: 'stats' as const,    icon: 'chart',  label: 'Metrics' },
  { id: 'profile' as const,  icon: 'user',   label: 'Account' },
];

interface TabBarProps {
  current: ScreenName | null;
  onNav: (s: ScreenName) => void;
  onHumanize: () => void;
}

export function TabBar({ current, onNav, onHumanize }: TabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      paddingBottom: Math.max(insets.bottom, 14), paddingTop: 10,
      flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end',
      backgroundColor: theme.tabbarBg, borderTopWidth: 1, borderTopColor: theme.border,
    }}>
      {TABS.map(t => {
        if (t.center) {
          return (
            <Pressable key={t.id} onPress={onHumanize} style={({ pressed }) => ({
              width: 54, height: 54, borderRadius: 18, backgroundColor: theme.accent,
              alignItems: 'center', justifyContent: 'center', marginBottom: 2,
              transform: [{ scale: pressed ? 0.92 : 1 }],
            })}>
              <Icon name="wand" size={26} sw={1.9} stroke="#fff" />
            </Pressable>
          );
        }
        const active = current === t.id;
        return (
          <Pressable key={t.id} onPress={() => onNav(t.id)} style={{
            alignItems: 'center', gap: 4, width: 58,
          }}>
            <Icon name={t.icon} size={24} sw={active ? 2.1 : 1.8} stroke={active ? theme.accent : theme.textFaint} />
            <Text style={{ fontSize: 10, fontWeight: active ? '700' : '500', color: active ? theme.accent : theme.textFaint, letterSpacing: -0.1 }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
