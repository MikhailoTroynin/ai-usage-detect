import React from 'react';
import { View, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { Gauge } from '../components/Gauge';
import { Icon } from '../components/Icon';
import { useTheme } from '../theme/ThemeContext';
import { DETECTORS, READABILITY } from '../data/content';
import { ScreenProps } from '../navigation/types';

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

export function Metrics({ go }: ScreenProps) {
  const { theme } = useTheme();
  const dist = [9, 14, 22, 18, 11, 16, 7, 19, 12];
  const maxD = Math.max(...dist);
  return (
    <Screen>
      <Header title="Metrics" sub="Readability & detection health of your last run." />
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        <Card pad={18}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            <Gauge value={READABILITY.fre} size={112} thickness={11} color={theme.accent} label={String(READABILITY.fre)} sub="Flesch ease" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16.5, fontWeight: '700', letterSpacing: -0.3, color: theme.text }}>Easy to read</Text>
              <Text style={{ fontSize: 13.5, color: theme.textMuted, marginTop: 5, lineHeight: 19 }}>
                Above the 60-point target. Roughly an 8th-grade reading level.
              </Text>
              <Chip color={theme.riskGreen} bg={theme.riskGreenBg} style={{ marginTop: 10 }} icon={<Icon name="check" size={12} sw={2.6} stroke={theme.riskGreen} />}>
                Meets quality bar
              </Chip>
            </View>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatTile label="Grade level" value={READABILITY.fkgl} hint="Flesch-Kincaid" good />
          <StatTile label="Avg. sentence" value={READABILITY.avgSentence} unit="w" hint="High burstiness" good />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatTile label="Avg. syllables" value={READABILITY.avgSyllables} hint="per word" />
          <StatTile label="Passive voice" value={READABILITY.passive} unit="%" hint="Low — good" good />
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
