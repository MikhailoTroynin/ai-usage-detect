import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { Screen } from '../components/Screen';
import { Gauge } from '../components/Gauge';
import { Icon } from '../components/Icon';
import { Chip } from '../components/Chip';
import { Button } from '../components/Button';
import { useTheme } from '../theme/ThemeContext';
import { PIPELINE } from '../data/content';
import { HumanizeStage, ScreenProps } from '../navigation/types';

function Spinner({ size = 13, color }: { size?: number; color: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true })).start();
  }, []);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{
      width: size, height: size, borderRadius: 999, borderWidth: 2,
      borderColor: color, borderTopColor: 'transparent', transform: [{ rotate }],
    }} />
  );
}

interface ProcessingProps extends ScreenProps {
  stage: HumanizeStage;
  error: string | null;
  onRetry: () => void;
  onCancel: () => void;
}

// Only the leading steps get a cosmetic timer — there's no server-side signal for
// sub-progress within a single /humanize call, so the final step's completion is
// gated entirely on the real response landing (stage === 'done'), not a clock.
export function Processing({ go, stage, error, onRetry, onCancel }: ProcessingProps) {
  const { theme } = useTheme();
  const [active, setActive] = useState(0);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (stage !== 'pending') return;
    setActive(0);
    const per = 900;
    const timers = PIPELINE.slice(0, -1).map((_, i) => setTimeout(() => setActive(i + 1), per * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, [stage]);

  useEffect(() => {
    if (stage === 'pending') {
      const id = setInterval(() => setPct(p => Math.min(92, p + 1.4)), 70);
      return () => clearInterval(id);
    }
    if (stage === 'done') {
      setActive(PIPELINE.length);
      setPct(100);
      const done = setTimeout(() => go('result'), 500);
      return () => clearTimeout(done);
    }
    if (stage === 'error') {
      setPct(0);
    }
  }, [stage]);

  if (stage === 'error') {
    return (
      <Screen pt={70} pb={30} scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, gap: 18 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 20, backgroundColor: theme.riskRedBg,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="close" size={28} sw={2.4} stroke={theme.riskRed} />
          </View>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: theme.text, textAlign: 'center' }}>
              Couldn't humanize that text
            </Text>
            <Text style={{ fontSize: 14, color: theme.textMuted, textAlign: 'center' }}>
              {error ?? 'Something went wrong. Please try again.'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
            <View style={{ flex: 1 }}><Button variant="ghost" size="md" full onPress={onCancel}>Back</Button></View>
            <View style={{ flex: 1 }}><Button variant="primary" size="md" full icon="refresh" onPress={onRetry}>Retry</Button></View>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen pt={70} pb={30} scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}>
        <View style={{ alignItems: 'center', marginBottom: 36 }}>
          <View>
            <Gauge value={pct} size={150} thickness={10} color={theme.accent} label={`${Math.round(pct)}%`} sub="humanizing" big />
            <View style={{
              position: 'absolute', top: -8, left: -8, right: -8, bottom: -8, borderRadius: 999,
              borderWidth: 2, borderColor: theme.accentSoft,
            }} />
          </View>
        </View>

        <View style={{ alignItems: 'center', marginBottom: 26 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.6, color: theme.text }}>Breaking the AI fingerprint</Text>
          <Text style={{ fontSize: 14.5, color: theme.textMuted, marginTop: 5 }}>This usually takes a few seconds.</Text>
        </View>

        <View style={{ gap: 10 }}>
          {PIPELINE.map((l, i) => {
            const done = i < active, running = i === active;
            return (
              <View key={l.id} style={{
                flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14,
                borderRadius: 14, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
                opacity: done || running ? 1 : 0.5,
              }}>
                <View style={{
                  width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: done ? theme.riskGreenBg : running ? theme.accentSoft : theme.surface2,
                }}>
                  {done ? <Icon name="check" size={17} sw={2.4} stroke={theme.riskGreen} />
                    : running ? <Spinner color={theme.accent} />
                    : <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.textFaint }}>{i + 1}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '600', letterSpacing: -0.2, color: theme.text }}>{l.label}</Text>
                  <Text style={{ fontSize: 12.5, color: theme.textMuted, marginTop: 1 }}>{l.sub}</Text>
                </View>
                {running && <Chip color={theme.accent} bg={theme.accentSoft}>running</Chip>}
              </View>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}
