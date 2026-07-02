import React from 'react';
import { View, ScrollView, ViewStyle, StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

interface ScreenProps {
  children: React.ReactNode;
  pb?: number;
  pt?: number;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Screen({ children, pb = 110, pt, scroll = true, style }: ScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = (pt ?? 8) + insets.top;

  if (!scroll) {
    return (
      <View style={[{ flex: 1, backgroundColor: theme.bg, paddingTop: topPad, paddingBottom: pb }, style]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={[{ paddingTop: topPad, paddingBottom: pb }, style]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
