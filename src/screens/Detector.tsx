import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { Gauge } from '../components/Gauge';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useTheme } from '../theme/ThemeContext';
import { DETECT_SENTENCES, DETECTORS, SAMPLE_INPUT } from '../data/content';
import { ScreenProps } from '../navigation/types';
import { SentenceSpan } from './Result';

type Phase = 'input' | 'scanning' | 'done';

export function Detector({ go }: ScreenProps) {
  const { theme } = useTheme();
  const [text, setText] = useState(SAMPLE_INPUT);
  const [phase, setPhase] = useState<Phase>('input');
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const run = () => {
    setPhase('scanning');
    setTimeout(() => setPhase('done'), 1600);
  };

  return (
    <Screen pb={120}>
      <Header title="AI Detector" sub="Free, unlimited checks. No sign-up needed." />

      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        {phase !== 'done' && (
          <Card pad={0} style={{ overflow: 'hidden' }}>
            <View style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textMuted }}>Text to scan</Text>
              <Chip>{words} words</Chip>
            </View>
            <TextInput
              value={text} onChangeText={setText}
              placeholder="Paste any text to check how AI-detectable it is…"
              placeholderTextColor={theme.textFaint}
              multiline
              style={{ minHeight: 170, padding: 15, fontSize: 15, lineHeight: 22, color: theme.text }}
            />
          </Card>
        )}

        {phase === 'input' && (
          <Button full size="lg" icon="detect" disabled={!words} onPress={run}>Scan for AI</Button>
        )}

        {phase === 'scanning' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11, paddingVertical: 16 }}>
            <ActivityIndicator size="small" color={theme.accent} />
            <Text style={{ color: theme.textMuted, fontSize: 15, fontWeight: '600' }}>Scanning across 4 detectors…</Text>
          </View>
        )}

        {phase === 'done' && (
          <>
            <Card pad={20} style={{ backgroundColor: theme.riskRedBg, borderColor: theme.riskRed }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                <Gauge value={94} size={108} thickness={11} color={theme.riskRed} label="94%" sub="likely AI" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: theme.text, letterSpacing: -0.3 }}>Heavily AI-detectable</Text>
                  <Text style={{ fontSize: 13.5, color: theme.textMuted, marginTop: 5, lineHeight: 19 }}>
                    This text would be flagged by most detectors. 4 of 5 sentences read as machine-written.
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                {DETECTORS.map(d => (
                  <View key={d.id} style={{ flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.surface, borderRadius: 10, padding: 10 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.textMuted }}>{d.name}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: theme.riskRed }}>{d.before}%</Text>
                  </View>
                ))}
              </View>
            </Card>

            <Card pad={16}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textMuted, marginBottom: 10 }}>Sentence breakdown</Text>
              <Text style={{ fontSize: 15, lineHeight: 26, color: theme.text }}>
                {DETECT_SENTENCES.map(s => <SentenceSpan key={s.id} s={{ ...s, alts: null }} />)}
              </Text>
            </Card>

            <Card pad={18} style={{ backgroundColor: theme.accent, borderWidth: 0 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', letterSpacing: -0.4, color: '#fff' }}>Fix it in one click</Text>
              <Text style={{ fontSize: 13.5, opacity: 0.9, marginTop: 5, lineHeight: 19, color: '#fff' }}>
                Run this through our humanizer and drop detection below 10% — while keeping it readable.
              </Text>
              <Pressable onPress={() => go('humanize')} style={{
                marginTop: 14, height: 50, borderRadius: theme.radii.md, backgroundColor: '#fff',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
              }}>
                <Icon name="wand" size={19} stroke={theme.accent} />
                <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 16 }}>Humanize this text</Text>
              </Pressable>
            </Card>
            <Pressable onPress={() => setPhase('input')} style={{ padding: 4, alignItems: 'center' }}>
              <Text style={{ color: theme.textMuted, fontSize: 14, fontWeight: '600' }}>Scan another text</Text>
            </Pressable>
          </>
        )}
      </View>
    </Screen>
  );
}
