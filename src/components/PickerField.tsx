import React, { useState } from 'react';
import { Pressable, View, Text } from 'react-native';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { useTheme } from '../theme/ThemeContext';

interface PickerFieldProps {
  label: string;
  value: string;
  onPick: (v: string) => void;
  options: string[];
}

export function PickerField({ label, value, onPick, options }: PickerFieldProps) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={{
        flex: 1, backgroundColor: theme.surface,
        borderWidth: 1, borderColor: theme.border, borderRadius: theme.radii.md, padding: 13,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: theme.textFaint, fontWeight: '700', letterSpacing: 0.2, textTransform: 'uppercase' }}>{label}</Text>
          <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: theme.text, letterSpacing: -0.2, marginTop: 2 }}>{value}</Text>
        </View>
        <Icon name="chevD" size={17} stroke={theme.textFaint} />
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={`Choose ${label.toLowerCase()}`}>
        <View style={{ gap: 2, paddingBottom: 8 }}>
          {options.map(o => {
            const active = o === value;
            return (
              <Pressable key={o} onPress={() => { onPick(o); setOpen(false); }} style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12,
                backgroundColor: active ? theme.accentSoft : 'transparent',
              }}>
                <Text style={{ fontSize: 16, fontWeight: active ? '700' : '500', color: active ? theme.accent : theme.text, letterSpacing: -0.2 }}>{o}</Text>
                {active && <Icon name="check" size={19} stroke={theme.accent} sw={2.2} />}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </>
  );
}
