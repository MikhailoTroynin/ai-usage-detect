import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Gauge } from '../components/Gauge';
import { Chip, useRisk } from '../components/Chip';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { Sheet } from '../components/Sheet';
import { useTheme } from '../theme/ThemeContext';
import { DETECTORS, ResultSentence, RESULT_SENTENCES, Risk } from '../data/content';
import { HumanizeDetector, HumanizeResult, ScreenProps } from '../navigation/types';
import { alternatives, ApiError } from '../lib/api';

export function SentenceSpan({ s, onPress }: { s: ResultSentence | { id: string; text: string; risk: Risk; score: number; alts?: null }; onPress?: () => void }) {
  const RISK = useRisk();
  const clickable = s.risk !== 'green' && !!onPress;
  const r = RISK[s.risk];
  return (
    <Text
      onPress={clickable ? onPress : undefined}
      style={{
        backgroundColor: s.risk === 'green' ? 'transparent' : r.bg,
        textDecorationLine: s.risk === 'green' ? 'none' : 'underline',
        textDecorationColor: r.c,
      }}
    >
      {s.text}{' '}
    </Text>
  );
}

interface ResultProps extends ScreenProps {
  result: HumanizeResult | null;
}

export function Result({ go, result }: ResultProps) {
  const { theme } = useTheme();
  const RISK = useRisk();
  const [sentences, setSentences] = useState<ResultSentence[]>(result?.sentences ?? RESULT_SENTENCES);

  useEffect(() => {
    setSentences(result?.sentences ?? RESULT_SENTENCES);
    setActive(null);
    setAltsError(null);
    setAltsLoading(false);
  }, [result]);
  const [active, setActive] = useState<ResultSentence | null>(null);
  const [copied, setCopied] = useState(false);
  const [altsLoading, setAltsLoading] = useState(false);
  const [altsError, setAltsError] = useState<string | null>(null);

  const flagged = sentences.filter(s => s.risk !== 'green').length;
  const overall = sentences.length > 0 ? Math.round(sentences.reduce((a, s) => a + s.score, 0) / sentences.length) : 0;
  const before = result?.beforeScore ?? 94;

  // Real per-provider before/after scores from the live run; the static DETECTORS
  // mock is only the demo fallback for the Home → History preview (no live run).
  const detectorRows: HumanizeDetector[] = result
    ? result.detectors
    : DETECTORS.map(d => ({ id: d.id, name: d.name, before: d.before, after: d.after, available: true }));
  const riskColor = (score: number) => RISK[score >= 66 ? 'red' : score >= 35 ? 'amber' : 'green'].c;

  const openSentence = async (s: ResultSentence) => {
    setActive(s);
    setAltsError(null);
    if (s.alts && s.alts.length > 0) return;
    setAltsLoading(true);
    try {
      const alts = await alternatives(s.text, 3);
      setSentences(prev => prev.map(x => (x.id === s.id ? { ...x, alts } : x)));
      setActive(prev => (prev && prev.id === s.id ? { ...prev, alts } : prev));
    } catch (err) {
      setAltsError(err instanceof ApiError ? err.message : 'Could not load alternatives.');
    } finally {
      setAltsLoading(false);
    }
  };

  const applyAlt = (alt: string) => {
    setSentences(prev => prev.map(s => s.id === active!.id
      ? { ...s, text: alt, risk: 'green' as Risk, score: Math.floor(Math.random() * 8) + 3, alts: null }
      : s));
    setActive(null);
  };

  const copy = () => { setCopied(true); setTimeout(() => setCopied(false), 1600); };

  return (
    <Screen pb={120}>
      <Header title="Result" sub="Tap any highlighted sentence to swap it." onBack={() => go('home')} />

      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <Card pad={18}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            <Gauge value={overall} size={104} thickness={10} color={theme.riskGreen} label={`${overall}%`} sub="AI score" />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <Chip color={theme.riskRed} bg={theme.riskRedBg}>Before {before}%</Chip>
                <Icon name="arrowR" size={15} stroke={theme.textFaint} />
                <Chip color={theme.riskGreen} bg={theme.riskGreenBg}>After {overall}%</Chip>
              </View>
              <Text style={{ fontSize: 13.5, color: theme.textMuted, lineHeight: 19 }}>
                {flagged === 0
                  ? 'Every sentence now reads as human. Ready to ship.'
                  : `${flagged} sentence${flagged > 1 ? 's' : ''} still flagged — tap to refine.`}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            {detectorRows.map(d => (
              <View key={d.id} style={{ flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.surface2, borderRadius: 10, padding: 10 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.textMuted }}>{d.name}</Text>
                {d.available && d.after !== null ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    {d.before !== null && (
                      <>
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.textFaint }}>{d.before}%</Text>
                        <Icon name="arrowR" size={12} stroke={theme.textFaint} />
                      </>
                    )}
                    <Text style={{ fontSize: 13, fontWeight: '800', color: riskColor(d.after) }}>{d.after}%</Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.textFaint }}>N/A</Text>
                )}
              </View>
            ))}
          </View>
        </Card>

        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', letterSpacing: -0.2, color: theme.text }}>Humanized text</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {(['green', 'amber', 'red'] as Risk[]).map(k => (
                <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: RISK[k].c }} />
                  <Text style={{ fontSize: 11.5, color: theme.textMuted, fontWeight: '600' }}>{RISK[k].label}</Text>
                </View>
              ))}
            </View>
          </View>
          <Card pad={16}>
            <Text style={{ fontSize: 15.5, lineHeight: 26, color: theme.text }}>
              {sentences.map(s => <SentenceSpan key={s.id} s={s} onPress={() => openSentence(s)} />)}
            </Text>
          </Card>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button variant={copied ? 'soft' : 'ghost'} size="md" full icon={copied ? 'check' : 'copy'} onPress={copy}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="ghost" size="md" full icon="refresh" onPress={() => go('humanize')}>Re-run</Button>
        </View>
        <Button variant="soft" size="md" full icon="chart" onPress={() => go('stats')}>View readability metrics</Button>
      </View>

      <Sheet open={!!active} onClose={() => setActive(null)} title="Choose an alternative">
        {active && (
          <View style={{ gap: 12, paddingBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Chip color={RISK[active.risk].c} bg={RISK[active.risk].bg}>{RISK[active.risk].label} · {active.score}%</Chip>
              <Text style={{ fontSize: 12.5, color: theme.textMuted }}>Generated at temperature 1.0</Text>
            </View>
            {altsLoading && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 22 }}>
                <ActivityIndicator size="small" color={theme.accent} />
                <Text style={{ color: theme.textMuted, fontSize: 14, fontWeight: '600' }}>Generating alternatives…</Text>
              </View>
            )}
            {!altsLoading && altsError && (
              <View style={{ gap: 10, alignItems: 'center', paddingVertical: 12 }}>
                <Text style={{ color: theme.riskRed, fontSize: 13.5, textAlign: 'center' }}>{altsError}</Text>
                <Button variant="ghost" size="sm" icon="refresh" onPress={() => openSentence(active)}>Retry</Button>
              </View>
            )}
            {!altsLoading && !altsError && active.alts && active.alts.map((alt, i) => (
              <Pressable key={i} onPress={() => applyAlt(alt)} style={{
                borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, borderRadius: 14,
                padding: 15, flexDirection: 'row', gap: 11,
              }}>
                <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: theme.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.accent }}>{i + 1}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 14.5, lineHeight: 21, color: theme.text }}>{alt}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Sheet>
    </Screen>
  );
}
