import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { useRisk } from '../components/Chip';
import { useTheme } from '../theme/ThemeContext';
import { ScreenProps } from '../navigation/types';

const DEMO = [
  { t: 'Our cutting-edge solution leverages synergy', r: 'red' as const },
  { t: "Honestly? It just works the way you'd hope.", r: 'green' as const },
];

export function Onboarding({ go }: ScreenProps) {
  const { theme } = useTheme();
  const RISK = useRisk();
  return (
    <Screen pt={70} pb={30} scroll={false}>
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        <View style={{ flex: 1, justifyContent: 'center', gap: 26 }}>
          <Logo size={60} />
          <View>
            <Text style={{ fontSize: 38, fontWeight: '800', letterSpacing: -1.4, lineHeight: 42, color: theme.text }}>
              Write like a{'\n'}human.{'\n'}
              <Text style={{ color: theme.accent }}>Pass every detector.</Text>
            </Text>
            <Text style={{ fontSize: 16, color: theme.textMuted, marginTop: 14, lineHeight: 24, letterSpacing: -0.2 }}>
              Run AI drafts through a 4-layer humanizer that breaks the statistical fingerprint — and keeps your text readable.
            </Text>
          </View>

          <Card pad={14} style={{ backgroundColor: theme.surface }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textFaint, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>
              Live sentence scoring
            </Text>
            <View style={{ gap: 8 }}>
              {DEMO.map((d, i) => (
                <View key={i} style={{
                  paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10,
                  backgroundColor: RISK[d.r].bg, borderLeftWidth: 3, borderLeftColor: RISK[d.r].c,
                }}>
                  <Text style={{ fontSize: 14, lineHeight: 20, color: theme.text }}>{d.t}</Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        <View style={{ gap: 12 }}>
          <Button full size="lg" icon="arrowR" onPress={() => go('home')}>Get started — it's free</Button>
          <Pressable onPress={() => go('home')} style={{ alignItems: 'center', padding: 6 }}>
            <Text style={{ color: theme.textMuted, fontSize: 15, fontWeight: '600' }}>I already have an account</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
