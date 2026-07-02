import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface SegmentedProps<T> {
  options: T[];
  value: any;
  onChange: (id: any) => void;
  getLabel?: (o: T) => string;
  getId?: (o: T) => any;
}

export function Segmented<T>({ options, value, onChange, getLabel = (o: any) => o, getId = (o: any) => o }: SegmentedProps<T>) {
  const { theme } = useTheme();
  return (
    <View style={{
      flexDirection: 'row', backgroundColor: theme.surface2, borderRadius: theme.radii.md,
      padding: 4, gap: 2, borderWidth: 1, borderColor: theme.border,
    }}>
      {options.map((o, i) => {
        const id = getId(o);
        const active = id === value;
        return (
          <Pressable
            key={String(id) + i}
            onPress={() => onChange(id)}
            style={{
              flex: 1, height: 38, borderRadius: theme.radii.md - 4,
              backgroundColor: active ? theme.surface : 'transparent',
              alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOpacity: active ? theme.shadowOpacity : 0,
              shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
            }}
          >
            <Text style={{
              fontSize: 13.5, fontWeight: active ? '700' : '500',
              color: active ? theme.text : theme.textMuted, letterSpacing: -0.1,
            }}>{getLabel(o)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
