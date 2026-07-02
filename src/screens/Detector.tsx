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
import { SAMPLE_INPUT } from '../data/content';
import { ScreenProps, HumanizeResultSentence } from '../navigation/types';
import { SentenceSpan } from './Result';
import { ApiError, detect, DetectResult } from '../lib/api';

type Phase = 'input' | 'scanning' | 'done' | 'error';

export function Detector({ go }: ScreenProps) {
  const { theme } = useTheme();
  const [text, setText] = useState(SAMPLE_INPUT);
  const [phase, setPhase] = useState<Phase>('input');
  const [result, setResult] = useState<DetectResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const run = async () => {
    setPhase('scanning');
    setError(null);
    try {
      const nextResult = await detect(text);
      setResult(nextResult);
      setPhase('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not scan this text. Please try again.');
      setPhase('error');
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setPhase('input');
  };

  const score = result?.overallScore ?? 0;
  const flagged = result?.sentences.filter(s => s.risk !== 'green').length ?? 0;
  const sentenceSpans: HumanizeResultSentence[] = result?.sentences.map((s, i) => ({
    id: `d${i}`,
    text: s.text,
    risk: s.risk,
    score: s.score,
    alts: null,
  })) ?? [];
  const resultColor = result?.risk === 'red' ? theme.riskRed : result?.risk === 'amber' ? theme.riskAmber : theme.riskGreen;
  const resultBg = result?.risk === 'red' ? theme.riskRedBg : result?.risk === 'amber' ? theme.riskAmberBg : theme.riskGreenBg;
  const resultTitle = result?.risk === 'red' ? 'Heavily AI-detectable' : result?.risk === 'amber' ? 'Mixed AI signal' : 'Mostly human-sounding';

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
            <Text style={{ color: theme.textMuted, fontSize: 15, fontWeight: '600' }}>Running heuristic detector…</Text>
          </View>
        )}

        {phase === 'error' && (
          <Card pad={18} style={{ borderColor: theme.riskRed, gap: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: theme.text }}>Scan failed</Text>
            <Text style={{ fontSize: 13.5, color: theme.textMuted, lineHeight: 19 }}>{error}</Text>
            <Button full size="md" icon="refresh" onPress={run}>Try again</Button>
          </Card>
        )}

        {phase === 'done' && result && (
          <>
            <Card pad={20} style={{ backgroundColor: resultBg, borderColor: resultColor }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                <Gauge value={score} size={108} thickness={11} color={resultColor} label={`${score}%`} sub={result.risk === 'red' ? 'likely AI' : result.risk === 'amber' ? 'mixed' : 'low risk'} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: theme.text, letterSpacing: -0.3 }}>{resultTitle}</Text>
                  <Text style={{ fontSize: 13.5, color: theme.textMuted, marginTop: 5, lineHeight: 19 }}>
                    Heuristic scan flagged {flagged} of {result.sentences.length} sentence{result.sentences.length === 1 ? '' : 's'} as red or amber.
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                {[
                  ['Overall score', `${score}%`],
                  ['Sentences', String(result.sentences.length)],
                  ['Flagged', String(flagged)],
                  ['Engine', 'Heuristic'],
                ].map(([label, value]) => (
                  <View key={label} style={{ flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.surface, borderRadius: 10, padding: 10 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.textMuted }}>{label}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: resultColor }}>{value}</Text>
                  </View>
                ))}
              </View>
            </Card>

            <Card pad={16}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textMuted, marginBottom: 10 }}>Sentence breakdown</Text>
              <Text style={{ fontSize: 15, lineHeight: 26, color: theme.text }}>
                {sentenceSpans.map(s => <SentenceSpan key={s.id} s={s} />)}
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
            <Pressable onPress={reset} style={{ padding: 4, alignItems: 'center' }}>
              <Text style={{ color: theme.textMuted, fontSize: 14, fontWeight: '600' }}>Scan another text</Text>
            </Pressable>
          </>
        )}
      </View>
    </Screen>
  );
}
