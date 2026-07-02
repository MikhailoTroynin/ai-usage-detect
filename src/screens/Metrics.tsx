import React from 'react';
import { View, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { Gauge } from '../components/Gauge';
import { Icon } from '../components/Icon';
import { useTheme } from '../theme/ThemeContext';
import { DETECTORS, SAMPLE_INPUT } from '../data/content';
import { HumanizeResult, ScreenProps } from '../navigation/types';
import { analyzeReadability } from '../utils/readability';

function StatTile({ label, value, unit, hint, good }: { label: string; value: string | number; unit?: string; hint?: string; good?: boolean }) {
  const { theme } = useTheme();
  return (
    <Card pad={15} style={{ flex: 1 }}>
      <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: '600' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 6 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: -1, color: theme.text }}>{value}</Text>
        {unit && <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textMuted }}>{unit}</Text>}
      </View>
      {hint && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
          {good && <Icon name="check" size={13} sw={2.4} stroke={theme.riskGreen} />}
          <Text style={{ fontSize: 11.5, fontWeight: '600', color: good ? theme.riskGreen : theme.textMuted }}>{hint}</Text>
        </View>
      )}
    </Card>
  );
}

interface MetricsProps extends ScreenProps {
  result: HumanizeResult | null;
}

function getSentenceWordCounts(text: string): number[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim().split(/\s+/).filter(Boolean).length)
    .filter(Boolean);
}

export function Metrics({ result }: MetricsProps) {
  const { theme } = useTheme();
  const sourceText = result?.text ?? SAMPLE_INPUT;
  const readability = analyzeReadability(sourceText);
  const dist = getSentenceWordCounts(sourceText);
  const maxD = Math.max(...dist, 1);
  const fre = Math.max(0, Math.min(100, readability.fleschReadingEase));
  const readingLabel = readability.fleschReadingEase >= 60 ? 'Easy to read' : readability.fleschReadingEase >= 30 ? 'Moderately difficult' : 'Difficult to read';
  const targetMet = readability.fleschReadingEase >= 60;
  return (
    <Screen>
      <Header title="Metrics" sub="Readability & detection health of your last run." />
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        <Card pad={18}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            <Gauge value={fre} size={112} thickness={11} color={targetMet ? theme.accent : theme.riskAmber} label={String(readability.fleschReadingEase)} sub="Flesch ease" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16.5, fontWeight: '700', letterSpacing: -0.3, color: theme.text }}>{readingLabel}</Text>
              <Text style={{ fontSize: 13.5, color: theme.textMuted, marginTop: 5, lineHeight: 19 }}>
                {targetMet ? 'Above' : 'Below'} the 60-point target. Current Flesch-Kincaid grade is {readability.fleschKincaidGrade}.
              </Text>
              <Chip color={targetMet ? theme.riskGreen : theme.riskAmber} bg={targetMet ? theme.riskGreenBg : theme.riskAmberBg} style={{ marginTop: 10 }} icon={targetMet ? <Icon name="check" size={12} sw={2.6} stroke={theme.riskGreen} /> : undefined}>
                {targetMet ? 'Meets quality bar' : 'Needs simplification'}
              </Chip>
            </View>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatTile label="Grade level" value={readability.fleschKincaidGrade} hint="Flesch-Kincaid" good={readability.fleschKincaidGrade <= 9} />
          <StatTile label="Avg. sentence" value={readability.avgWordsPerSentence} unit="w" hint={`${readability.sentenceCount} sentence${readability.sentenceCount === 1 ? '' : 's'}`} good={readability.avgWordsPerSentence <= 20} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatTile label="Avg. syllables" value={readability.avgSyllablesPerWord} hint="per word" />
          <StatTile label="Words analyzed" value={readability.wordCount} hint="live text" good />
        </View>

        <Card pad={16}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', letterSpacing: -0.2, color: theme.text }}>Sentence length variation</Text>
            <Chip color={theme.accent} bg={theme.accentSoft}>burstiness</Chip>
          </View>
          <Text style={{ fontSize: 12.5, color: theme.textMuted, marginBottom: 14 }}>Varied length = harder to detect</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 96 }}>
            {dist.map((d, i) => (
              <View key={i} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                <View style={{ height: `${(d / maxD) * 100}%`, backgroundColor: i % 2 ? theme.accent : theme.accentSoft, borderRadius: 5 }} />
              </View>
            ))}
          </View>
        </Card>

        <Card pad={16}>
          <Text style={{ fontSize: 14, fontWeight: '700', letterSpacing: -0.2, color: theme.text }}>Detection: before → after</Text>
          <View style={{ gap: 14, marginTop: 14 }}>
            {DETECTORS.map(d => (
              <View key={d.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontWeight: '600', color: theme.text, fontSize: 13 }}>{d.name}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                    <Text style={{ color: theme.riskRed, fontWeight: '800' }}>{d.before}%</Text> → <Text style={{ color: theme.riskGreen, fontWeight: '800' }}>{d.after}%</Text>
                  </Text>
                </View>
                <View style={{ height: 8, backgroundColor: theme.surface2, borderRadius: 999, overflow: 'hidden' }}>
                  <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${d.before}%`, backgroundColor: theme.riskRedBg }} />
                  <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${d.after}%`, backgroundColor: theme.riskGreen, borderRadius: 999 }} />
                </View>
              </View>
            ))}
          </View>
        </Card>
      </View>
    </Screen>
  );
}
